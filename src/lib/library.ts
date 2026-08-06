import type { D1DatabaseLike } from "@/types/cloudflare";

export type SavedQuestion = { id: string; slug: string; question_text: string; category_name: string; saved_at: string };
export type UserCollection = { id: string; name: string; description: string; question_count: number; updated_at: string };

export async function getBookmarks(db: D1DatabaseLike, userId: string) {
  return (await db.prepare("SELECT q.id,q.slug,q.question_text,q.category_name,b.created_at saved_at FROM user_bookmarks b JOIN questions q ON q.id=b.question_id WHERE b.user_id=? AND q.publication_state='PUBLISHED' ORDER BY b.created_at DESC").bind(userId).all<SavedQuestion>()).results ?? [];
}

export async function getCollections(db: D1DatabaseLike, userId: string) {
  return (await db.prepare("SELECT c.id,c.name,c.description,c.updated_at,COUNT(cq.question_id) question_count FROM user_collections c LEFT JOIN user_collection_questions cq ON cq.collection_id=c.id WHERE c.user_id=? GROUP BY c.id ORDER BY c.updated_at DESC,c.name").bind(userId).all<UserCollection>()).results ?? [];
}

export async function getCollectionQuestions(db: D1DatabaseLike, collectionId: string, userId: string) {
  return (await db.prepare("SELECT q.id,q.slug,q.question_text,q.category_name,cq.created_at saved_at FROM user_collection_questions cq JOIN user_collections c ON c.id=cq.collection_id JOIN questions q ON q.id=cq.question_id WHERE cq.collection_id=? AND c.user_id=? AND q.publication_state='PUBLISHED' ORDER BY cq.created_at DESC").bind(collectionId,userId).all<SavedQuestion>()).results ?? [];
}
