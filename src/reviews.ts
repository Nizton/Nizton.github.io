export interface ClientReview {
  author: string;
  text: string;
}

// По поручению владельца добавьте первый реальный отзыв с именем автора и текстом.
// Пока список пуст, раздел отзывов и ссылка на него не выводятся.
export const clientReviews: readonly ClientReview[] = [];
