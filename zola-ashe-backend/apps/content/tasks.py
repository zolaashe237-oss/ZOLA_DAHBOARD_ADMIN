from config.celery import app


# TODO: tâches Celery de l'app content (emails, cron, traitements async).
@app.task
def ping():
    return "pong"
