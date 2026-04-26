export type Book = {
  id: number;
  title: string;
  author: string;
  price: number;
  synopsis: string;
  authorBio: string;
  reviews: { user: string; comment: string; rating: number }[];
  coverImageUrl?: string;
  publicationDate: string;
  pageCount: number;
  category: string;
};

export type CartItem = Book & { quantity: number };

export type Order = {
  id: string;
  date: string;
  totalPrice: number;
  items: CartItem[];
};
