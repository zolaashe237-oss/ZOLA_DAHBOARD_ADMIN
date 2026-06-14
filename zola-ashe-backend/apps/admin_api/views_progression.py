"""Vues de progression pour le back-office admin (KPIs, stats par formation, avancement membres, reset)."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Avg

from apps.accounts.models import Role, User, UserStatus
from apps.content.models import Quiz, QuizResult, Formation
from apps.content.services import visible_formations_qs, formation_accessible
from apps.audit.models import AuditAction
from apps.audit.services import record

from .permissions import IsAdmin
from .serializers import (
    ProgressionKpisSerializer,
    FormationProgressStatSerializer,
    MemberProgressEntrySerializer,
)


def get_member_formation_progress(user, formation):
    """
    Calcule l'avancement d'un membre sur une formation de manière optimisée.
    """
    modules = list(formation.modules.prefetch_related('courses', 'children', 'courses__quiz'))
    modules_total = len(modules)
    if modules_total == 0:
        return {
            "modules_completed": 0,
            "modules_total": 0,
            "progress_pct": 0,
            "completed": False
        }
    
    # Liste de tous les quiz actifs de cette formation
    quiz_ids = []
    for m in modules:
        for c in m.courses.all():
            if getattr(c, 'quiz', None) and c.quiz.active:
                quiz_ids.append(c.quiz.id)
                
    # Récupère tous les quiz validés par ce membre
    validated_quizzes = set(
        QuizResult.objects.filter(user=user, quiz_id__in=quiz_ids, validated=True)
        .values_list('quiz_id', flat=True)
    )
    
    # Vérifie si un cours est terminé
    def is_course_completed(course):
        quiz = getattr(course, 'quiz', None)
        if not quiz or not quiz.active:
            return True
        return quiz.id in validated_quizzes
        
    # Vérifie si un module (et ses sous-modules récursivement) est terminé
    children_map = {}
    for m in modules:
        if m.parent_id:
            children_map.setdefault(m.parent_id, []).append(m)
            
    completed_cache = {}
    def is_module_completed(module):
        if module.id in completed_cache:
            return completed_cache[module.id]
            
        # Vérifie les cours du module
        for c in module.courses.all():
            if not is_course_completed(c):
                completed_cache[module.id] = False
                return False
                
        # Vérifie les sous-modules
        for child in children_map.get(module.id, []):
            if not is_module_completed(child):
                completed_cache[module.id] = False
                return False
                
        completed_cache[module.id] = True
        return True
        
    modules_completed = 0
    for m in modules:
        if is_module_completed(m):
            modules_completed += 1
            
    progress_pct = int(round(modules_completed / modules_total * 100)) if modules_total > 0 else 0
    return {
        "modules_completed": modules_completed,
        "modules_total": modules_total,
        "progress_pct": progress_pct,
        "completed": progress_pct == 100
    }


class ProgressionKpisView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        members = list(User.objects.filter(role=Role.MEMBER).exclude(status=UserStatus.BLOQUE))
        formations = list(visible_formations_qs())
        
        total_enrollments = 0
        total_completions = 0
        progress_pcts = []
        
        for f in formations:
            for m in members:
                if formation_accessible(m, f):
                    total_enrollments += 1
                    prog = get_member_formation_progress(m, f)
                    progress_pcts.append(prog["progress_pct"])
                    if prog["completed"]:
                        total_completions += 1
                        
        avg_completion_rate = sum(progress_pcts) / len(progress_pcts) if progress_pcts else 0.0
        
        # Moyenne des scores sur l'ensemble des quiz
        avg_score = QuizResult.objects.all().aggregate(avg=Avg('score'))['avg']
        
        data = {
            "total_enrollments": total_enrollments,
            "total_completions": total_completions,
            "avg_completion_rate": avg_completion_rate,
            "avg_quiz_score": float(avg_score) if avg_score is not None else None,
        }
        
        serializer = ProgressionKpisSerializer(data)
        return Response(serializer.data)


class FormationProgressStatView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        members = list(User.objects.filter(role=Role.MEMBER).exclude(status=UserStatus.BLOQUE))
        formations = visible_formations_qs()
        
        stats = []
        for f in formations:
            enrolled_count = 0
            completed_count = 0
            progress_pcts = []
            
            for m in members:
                if formation_accessible(m, f):
                    enrolled_count += 1
                    prog = get_member_formation_progress(m, f)
                    progress_pcts.append(prog["progress_pct"])
                    if prog["completed"]:
                        completed_count += 1
            
            completion_rate = (completed_count / enrolled_count * 100.0) if enrolled_count > 0 else 0.0
            avg_progress_pct = (sum(progress_pcts) / len(progress_pcts)) if progress_pcts else 0.0
            
            # Quizz appartenant à cette formation
            quizzes = Quiz.objects.filter(Q(course__module__formation=f) | Q(formation=f))
            avg_score = QuizResult.objects.filter(quiz__in=quizzes).aggregate(avg=Avg('score'))['avg']
            
            from apps.content.services import generate_signed_url
            cover = generate_signed_url(f.cover_key) if f.cover_key else f.cover_url
            
            stats.append({
                "formation_id": f.id,
                "formation_title": f.title,
                "cover_url": cover or None,
                "enrolled_count": enrolled_count,
                "completed_count": completed_count,
                "completion_rate": completion_rate,
                "avg_quiz_score": float(avg_score) if avg_score is not None else None,
                "avg_progress_pct": avg_progress_pct,
            })
            
        serializer = FormationProgressStatSerializer(stats, many=True)
        return Response(serializer.data)


class MemberProgressListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        params = request.query_params
        
        members_qs = User.objects.filter(role=Role.MEMBER).exclude(status=UserStatus.BLOQUE)
        search = params.get("search")
        if search:
            members_qs = members_qs.filter(Q(full_name__icontains=search) | Q(email__icontains=search))
            
        members = list(members_qs)
        
        formations_qs = visible_formations_qs()
        formation_id = params.get("formation_id")
        if formation_id:
            formations_qs = formations_qs.filter(id=formation_id)
            
        formations = list(formations_qs)
        
        entries = []
        for f in formations:
            for m in members:
                if formation_accessible(m, f):
                    prog = get_member_formation_progress(m, f)
                    
                    # Score de l'examen final
                    final_exam_quiz = Quiz.objects.filter(formation=f).first()
                    quiz_score = None
                    if final_exam_quiz:
                        res = QuizResult.objects.filter(user=m, quiz=final_exam_quiz).first()
                        if res:
                            quiz_score = res.score
                            
                    # Quizz pour la dernière activité
                    quizzes = Quiz.objects.filter(Q(course__module__formation=f) | Q(formation=f))
                    last_res = QuizResult.objects.filter(user=m, quiz__in=quizzes).order_by('-validated_at').first()
                    last_activity = last_res.validated_at if last_res else None
                    
                    entries.append({
                        "user_id": m.id,
                        "user_name": m.full_name,
                        "user_email": m.email,
                        "formation_id": f.id,
                        "formation_title": f.title,
                        "progress_pct": prog["progress_pct"],
                        "modules_completed": prog["modules_completed"],
                        "modules_total": prog["modules_total"],
                        "quiz_score": float(quiz_score) if quiz_score is not None else None,
                        "last_activity": last_activity,
                        "completed": prog["completed"],
                    })
                    
        # Filtre de complétion
        completed_filter = params.get("completed")
        if completed_filter is not None:
            is_completed = completed_filter.lower() == 'true'
            entries = [e for e in entries if e["completed"] == is_completed]
            
        serializer = MemberProgressEntrySerializer(entries, many=True)
        return Response(serializer.data)


class ResetProgressView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        user_id = request.data.get("user_id")
        formation_id = request.data.get("formation_id")
        reason = request.data.get("reason", "")
        
        if not user_id or not formation_id:
            return Response({"detail": "Champs user_id et formation_id requis."}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.filter(id=user_id).first()
        formation = Formation.objects.filter(id=formation_id).first()
        if not user or not formation:
            return Response({"detail": "Membre ou formation introuvable."}, status=status.HTTP_404_NOT_FOUND)
            
        # Récupère tous les quiz de la formation (cours + final)
        quizzes = Quiz.objects.filter(Q(course__module__formation=formation) | Q(formation=formation))
        
        # Supprime les résultats des tentatives pour ces quiz
        deleted_count, _ = QuizResult.objects.filter(user=user, quiz__in=quizzes).delete()
        
        # Journalisation dans l'audit
        record(
            request.user, 
            AuditAction.RESET_QUIZ, 
            target_type="FormationProgress", 
            target_id=f"{user.id}-{formation.id}",
            reason=reason, 
            payload={"user_id": user.id, "formation_id": formation.id}
        )
        
        return Response({"detail": "Progression réinitialisée avec succès."})
