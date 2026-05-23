// Types partagés du frontend, alignés sur les serializers DRF du backend.

export type UserStatus = "ACTIF" | "RESTREINT" | "BLOQUE";
export type Role = "MEMBER" | "ADMIN";
export type Category = "LIVRE" | "FORMATION" | "LIBRE";
export type ContentType = "VIDEO" | "PDF" | "AUDIO";
export type Audience = "TOUS" | "FEMME" | "ENFANT";

export interface User {
  id: number;
  email: string;
  full_name: string;
  photo: string | null;
  role: Role;
  status: UserStatus;
  email_verified: boolean;
  nb_warnings: number;
  created_at: string;
}

export interface AccessState {
  locked: boolean;
  lock_reason: "subscription" | "quiz" | null;
}

export interface ContentItem {
  id: number;
  content_type: ContentType;
  title: string;
  description: string;
  category: Category;
  order: number;
  collection: number | null;
  thumbnail: string;
  quiz_active: boolean;
  access: AccessState;
}

export interface Subscription {
  id: number;
  type: string;
  start: string;
  end: string | null;
  active: boolean;
  in_tranches: boolean;
  created_at: string;
}

export interface Author {
  id: number;
  full_name: string;
  photo: string | null;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  cover_url: string;
  category: string;
  author_name: string;
  published_at: string | null;
  body?: string;
}

export interface Post {
  id: number;
  author: Author;
  text: string;
  image: string | null;
  video: string | null;
  audience: Audience;
  is_pinned: boolean;
  is_announcement: boolean;
  likes_count: number;
  liked_by_me: boolean;
  comments_count: number;
  shared_from: number | null;
  created_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
