/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Menu, X, Plus, Minus, Trash2, ChevronRight, CheckCircle, ArrowLeft, Loader2, Sun, Moon, Heart, ChevronUp, MessageCircle, Instagram, Phone, ChevronDown } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Skeleton } from './components/Skeleton';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

type Book = {
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
};

type CartItem = Book & { quantity: number };

type Order = {
  id: string;
  date: string;
  totalPrice: number;
  items: CartItem[];
};

export default function App() {
  const [booksState, setBooks] = useState<Book[]>([
    { 
      id: 1, 
      title: 'The Great Gatsby', 
      author: 'F. Scott Fitzgerald', 
      price: 2500,
      synopsis: 'A story of wealth, love, and the American Dream in the 1920s. Set in the roaring twenties, it explores themes of decadence, idealism, resistance to change, social upheaval, and excess.',
      authorBio: 'F. Scott Fitzgerald was an American novelist and short story writer.',
      reviews: [{ user: 'Alice', comment: 'A classic!', rating: 5 }],
      coverImageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80',
      publicationDate: '1925-04-10',
      pageCount: 180
    },
    { 
      id: 2, 
      title: 'To Kill a Mockingbird', 
      author: 'Harper Lee', 
      price: 3000,
      synopsis: 'A powerful story about racial injustice and loss of innocence in the American South. Atticus Finch, a lawyer in the Depression-era South, defends a black man against an undeserved rape charge, and his children against prejudice.',
      authorBio: 'Harper Lee was an American novelist best known for this book.',
      reviews: [{ user: 'Bob', comment: 'Must read.', rating: 5 }],
      coverImageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
      publicationDate: '1960-07-11',
      pageCount: 281
    },
    { 
      id: 3, 
      title: '1984', 
      author: 'George Orwell', 
      price: 2800,
      synopsis: 'A dystopian novel about a totalitarian regime. Winston Smith struggles for humanity in a world of constant surveillance, propaganda, and thought control.',
      authorBio: 'George Orwell was an English novelist and essayist.',
      reviews: [{ user: 'Charlie', comment: 'Terrifyingly relevant.', rating: 4 }],
      coverImageUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=400&q=80',
      publicationDate: '1949-06-08',
      pageCount: 328
    },
    { 
      id: 4, 
      title: 'Pride and Prejudice', 
      author: 'Jane Austen', 
      price: 3500,
      synopsis: 'A romantic novel of manners. Elizabeth Bennet navigates issues of manners, upbringing, morality, education, and marriage in the society of the landed gentry of the British Regency.',
      authorBio: 'Jane Austen was an English novelist known for her six major novels.',
      reviews: [{ user: 'Diana', comment: 'So romantic!', rating: 5 }],
      coverImageUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=400&q=80',
      publicationDate: '1813-01-28',
      pageCount: 432
    },
    { 
      id: 5, 
      title: 'The Catcher in the Rye', 
      author: 'J.D. Salinger', 
      price: 2700,
      synopsis: 'A story about teenage rebellion and alienation. Holden Caulfield, a teenager who has been expelled from prep school, wanders through New York City.',
      authorBio: 'J.D. Salinger was an American writer known for his novel The Catcher in the Rye.',
      reviews: [{ user: 'Eve', comment: 'Deeply relatable.', rating: 4 }],
      coverImageUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=400&q=80',
      publicationDate: '1951-07-16',
      pageCount: 234
    },
    { 
      id: 6, 
      title: 'Brave New World', 
      author: 'Aldous Huxley', 
      price: 2900,
      synopsis: 'A dystopian social science fiction novel. It explores a futuristic World State, whose citizens are environmentally engineered into an intelligence-based social hierarchy.',
      authorBio: 'Aldous Huxley was an English writer and philosopher.',
      reviews: [{ user: 'Frank', comment: 'Fascinating concept.', rating: 5 }],
      coverImageUrl: 'https://images.unsplash.com/photo-1506806732259-39c2d0268443?auto=format&fit=crop&w=400&q=80',
      publicationDate: '1932-01-01',
      pageCount: 268
    },
    { 
      id: 7, 
      title: 'The Hobbit', 
      author: 'J.R.R. Tolkien', 
      price: 4000,
      synopsis: 'A fantasy novel about Bilbo Baggins, a hobbit who is hired by the wizard Gandalf to help a group of dwarves reclaim their mountain home from a dragon.',
      authorBio: 'J.R.R. Tolkien was an English writer, poet, philologist, and university professor.',
      reviews: [{ user: 'Grace', comment: 'Magical adventure!', rating: 5 }],
      coverImageUrl: 'https://images.unsplash.com/photo-1600861194942-f883de0dfe96?auto=format&fit=crop&w=400&q=80',
      publicationDate: '1937-09-21',
      pageCount: 310
    },
    { 
      id: 8, 
      title: 'Jane Eyre', 
      author: 'Charlotte Brontë', 
      price: 3200,
      synopsis: 'A novel about the experiences of its eponymous heroine, including her growth to adulthood and her love for Mr. Rochester, the brooding master of Thornfield Hall.',
      authorBio: 'Charlotte Brontë was an English novelist and poet.',
      reviews: [{ user: 'Hank', comment: 'A powerful story.', rating: 5 }],
      coverImageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
      publicationDate: '1847-10-16',
      pageCount: 532
    },
    { 
      id: 9, 
      title: 'The Picture of Dorian Gray', 
      author: 'Oscar Wilde', 
      price: 2600,
      synopsis: 'A philosophical novel about a young man whose portrait ages while he remains young and beautiful, reflecting his moral corruption.',
      authorBio: 'Oscar Wilde was an Irish poet and playwright.',
      reviews: [{ user: 'Ivy', comment: 'A haunting masterpiece.', rating: 5 }],
      coverImageUrl: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&w=400&q=80',
      publicationDate: '1890-06-20',
      pageCount: 254
    },
    { 
      id: 10, 
      title: 'Frankenstein', 
      author: 'Mary Shelley', 
      price: 2800,
      synopsis: 'A gothic novel about a scientist who creates a sentient creature in an unorthodox scientific experiment.',
      authorBio: 'Mary Shelley was an English novelist who wrote the Gothic novel Frankenstein.',
      reviews: [{ user: 'Jack', comment: 'Profound and tragic.', rating: 5 }],
      coverImageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=80',
      publicationDate: '1818-01-01',
      pageCount: 280
    },
    { 
      id: 11, 
      title: 'Moby-Dick', 
      author: 'Herman Melville', 
      price: 3800,
      synopsis: 'The narrative of Captain Ahab’s obsessive quest to kill the giant white whale, Moby Dick.',
      authorBio: 'Herman Melville was an American novelist, short story writer, and poet.',
      reviews: [{ user: 'Kelly', comment: 'An epic adventure.', rating: 4 }],
      coverImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
      publicationDate: '1851-10-18',
      pageCount: 635
    },
    { 
      id: 12, 
      title: 'Great Expectations', 
      author: 'Charles Dickens', 
      price: 3100,
      synopsis: 'The story of the orphan Pip, his childhood, his rise to wealth, and his eventual disillusionment.',
      authorBio: 'Charles Dickens was an English writer and social critic.',
      reviews: [{ user: 'Liam', comment: 'A Dickensian classic.', rating: 5 }],
      coverImageUrl: 'https://images.unsplash.com/photo-1589998059171-988d887df646?auto=format&fit=crop&w=400&q=80',
      publicationDate: '1861-08-01',
      pageCount: 544
    },
  ]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeView, setActiveView] = useState<'products' | 'orders' | 'wishlist'>('products');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [quickViewBook, setQuickViewBook] = useState<Book | null>(null);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [addingToCart, setAddingToCart] = useState<number | null>(null);
  const [newReview, setNewReview] = useState({ user: '', comment: '', rating: 5 });
  const [viewedBooks, setViewedBooks] = useState<number[]>([]);
  const [purchasedBooks, setPurchasedBooks] = useState<number[]>([]);
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [wishlist, setWishlist] = useState<Book[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const booksPerPage = 8;

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    // Simulate fetching books
    const timer = setTimeout(() => setIsLoadingBooks(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (viewedBooks.length === 0 && purchasedBooks.length === 0) return;
      setIsLoadingRecommendations(true);

      const viewedTitles = viewedBooks.map(id => booksState.find(b => b.id === id)?.title).filter(Boolean);
      const purchasedTitles = purchasedBooks.map(id => booksState.find(b => b.id === id)?.title).filter(Boolean);

      const prompt = `Based on the user's browsing history: ${viewedTitles.join(', ')} and purchase history: ${purchasedTitles.join(', ')}, recommend 2 books from the following list: ${booksState.map(b => b.title).join(', ')}. Return only the titles of the recommended books as a comma-separated list.`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });
        const recommendedTitles = response.text?.split(',').map(t => t.trim()) || [];
        setRecommendations(booksState.filter(b => recommendedTitles.includes(b.title)));
      } catch (error) {
        console.error("Error fetching recommendations:", error);
        setError("Failed to load recommendations. Please try again later.");
      } finally {
        setIsLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [viewedBooks, purchasedBooks, booksState]);

  const addReview = (bookId: number) => {
    setBooks(prev => prev.map(book => {
      if (book.id === bookId) {
        const updatedBook = { ...book, reviews: [...book.reviews, newReview] };
        if (selectedBook && selectedBook.id === bookId) setSelectedBook(updatedBook);
        return updatedBook;
      }
      return book;
    }));
    setNewReview({ user: '', comment: '', rating: 5 });
  };

  const addToCart = (book: Book) => {
    setAddingToCart(book.id);
    setTimeout(() => {
      setCart((prev) => {
        const existing = prev.find((item) => item.id === book.id);
        if (existing) {
          return prev.map((item) =>
            item.id === book.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        return [...prev, { ...book, quantity: 1 }];
      });
      setAddingToCart(null);
    }, 600);
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const filteredBooks = booksState.filter(
    (book) =>
      (book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const categories = ['All', 'Fiction', 'Dystopian', 'Fantasy', 'Classic'];
  
  const booksToDisplay = selectedCategory && selectedCategory !== 'All' 
    ? filteredBooks.filter(b => b.synopsis.toLowerCase().includes(selectedCategory.toLowerCase())) 
    : filteredBooks;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const startCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
    setCheckoutStep(1);
  };

  const toggleWishlist = (book: Book) => {
    setWishlist((prev) =>
      prev.find((item) => item.id === book.id)
        ? prev.filter((item) => item.id !== book.id)
        : [...prev, book]
    );
  };

  const finishCheckout = () => {
    const newOrder: Order = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      totalPrice: totalPrice,
      items: [...cart],
    };
    setOrders(prev => [...prev, newOrder]);
    setPurchasedBooks(prev => [...new Set([...prev, ...cart.map(item => item.id)])]);
    setIsCheckoutOpen(false); 
    setConfirmedOrder(newOrder);
    setCart([]);
  };

  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
    setViewedBooks(prev => [...new Set([...prev, book.id])]);
  };

  return (
    <div className={`min-h-screen font-sans ${theme === 'dark' ? 'bg-stone-900 text-stone-100' : 'bg-stone-50 text-stone-900'}`}>
      {error && (
        <div className="fixed top-20 left-0 w-full p-4 z-50">
          <div className="bg-red-100 text-red-700 p-4 rounded-xl shadow-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X size={20} /></button>
          </div>
        </div>
      )}
      <div className="bg-golden-brown-800 text-white text-xs py-2 px-6 flex justify-center">
        WELCOME TO KHENTI BOOKS
      </div>
      <header className="sticky top-0 z-50 border-b bg-white border-stone-200 dark:bg-stone-900 dark:border-stone-700">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedBook(null); setActiveView('products'); }}>
            <img src="https://i.imgur.com/q7x9LEj.png" alt="Logo" className="w-24 h-24 object-contain" />
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-bold dark:text-stone-300">
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-2 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search books..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearching(true);
                  setTimeout(() => setIsSearching(false), 500);
                }}
                className="w-24 md:w-48 pl-9 pr-4 py-1.5 rounded-full border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-golden-brown-500 bg-white text-stone-900 dark:bg-stone-800 dark:border-stone-700 dark:text-white"
              />
            </div>
            <div className="relative cursor-pointer bg-stone-900 p-2 rounded-full" onClick={() => setIsCartOpen(true)}>
              <ShoppingCart className="w-5 h-5 text-white hover:text-golden-brown-200" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-golden-brown-700 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </div>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800">
              {theme === 'light' ? <Moon className="w-5 h-5 dark:text-white" /> : <Sun className="w-5 h-5 dark:text-white" />}
            </button>
          </div>
        </nav>
        {isMobileMenuOpen && (
          <div className="md:hidden border-t p-4 bg-white dark:bg-stone-900">
            <div className="flex flex-col gap-4 text-sm font-bold dark:text-stone-300">
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <span className="block sm:inline">{error}</span>
            <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {activeView === 'orders' ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Order History</h2>
            {orders.length === 0 ? (
              <p className="text-stone-500">No orders found.</p>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                    <div className="flex justify-between mb-4">
                      <p className="font-semibold">Order #{order.id}</p>
                      <p className="text-stone-500">{order.date}</p>
                    </div>
                    <div className="space-y-2">
                      {order.items.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.title} x {item.quantity}</span>
                          <span>₦{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t mt-4 pt-4 flex justify-between font-bold">
                      <span>Total</span>
                      <span>₦{order.totalPrice}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : isLoadingBooks ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : selectedBook ? (
          <div className="space-y-8">
            <button onClick={() => setSelectedBook(null)} className="flex items-center gap-2 text-stone-500 hover:text-golden-brown-700">
              <ArrowLeft size={20} /> Back to Products
            </button>
            <div className="grid md:grid-cols-2 gap-12">
              <img src={selectedBook.coverImageUrl || 'https://placehold.co/400x400?text=Book+Cover'} alt={selectedBook.title} className="w-full aspect-[3/4] bg-stone-100 rounded-3xl object-cover" referrerPolicy="no-referrer" />
              <div className="space-y-6">
                <h1 className="text-4xl font-bold">{selectedBook.title}</h1>
                <p className="text-xl text-stone-600">{selectedBook.author}</p>
                <p className="text-2xl font-bold text-golden-brown-700">₦{selectedBook.price}</p>
                <p className="text-stone-700">{selectedBook.synopsis}</p>
                <button 
                  onClick={() => addToCart(selectedBook)}
                  disabled={addingToCart === selectedBook.id}
                  className="bg-stone-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-golden-brown-700 transition flex items-center gap-2"
                >
                  {addingToCart === selectedBook.id ? <Loader2 className="animate-spin" size={20} /> : 'Add to Cart'}
                </button>
                <div className="border-t pt-6">
                  <h3 className="font-bold mb-2">Author Bio</h3>
                  <p className="text-stone-600">{selectedBook.authorBio}</p>
                </div>
                <div className="border-t pt-6">
                  <h3 className="font-bold mb-2">Customer Reviews</h3>
                  {selectedBook.reviews.length > 0 ? (
                    <p className="text-sm text-stone-600 mb-4">
                      Average Rating: {(selectedBook.reviews.reduce((acc, r) => acc + r.rating, 0) / selectedBook.reviews.length).toFixed(1)} / 5
                    </p>
                  ) : (
                    <p className="text-sm text-stone-600 mb-4">No reviews yet.</p>
                  )}
                  {selectedBook.reviews.map((review, idx) => (
                    <div key={idx} className="bg-stone-100 p-4 rounded-xl mb-2">
                      <p className="font-semibold">{review.user} - {review.rating}/5</p>
                      <p className="text-stone-600">{review.comment}</p>
                    </div>
                  ))}
                  <div className="mt-6 bg-stone-50 p-4 rounded-xl border">
                    <h4 className="font-bold mb-2">Submit a Review</h4>
                    <input 
                      type="text" 
                      placeholder="Your Name" 
                      value={newReview.user} 
                      onChange={(e) => setNewReview({...newReview, user: e.target.value})}
                      className="w-full p-2 mb-2 border rounded-lg"
                    />
                    <textarea 
                      placeholder="Your Comment" 
                      value={newReview.comment} 
                      onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                      className="w-full p-2 mb-2 border rounded-lg"
                    />
                    <select 
                      value={newReview.rating} 
                      onChange={(e) => setNewReview({...newReview, rating: parseInt(e.target.value)})}
                      className="w-full p-2 mb-2 border rounded-lg"
                    >
                      {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r} Stars</option>)}
                    </select>
                    <button 
                      onClick={() => addReview(selectedBook.id)}
                      className="w-full bg-golden-brown-700 text-white py-2 rounded-lg font-semibold hover:bg-golden-brown-800 transition"
                    >
                      Submit Review
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <section className="bg-golden-brown-800 text-white rounded-3xl p-8 md:p-16 mb-12 dark:bg-golden-brown-900">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-8">Read, grow, repeat!</h1>
              <div className="relative">
                <button onClick={() => setIsCategoriesOpen(!isCategoriesOpen)} className="flex items-center justify-between w-64 bg-white text-golden-brown-800 px-6 py-3 rounded-full font-semibold hover:bg-golden-brown-50 transition dark:bg-stone-800 dark:text-white dark:hover:bg-stone-700">
                  <span>Browse Categories</span>
                  <ChevronDown size={20} />
                </button>
                {isCategoriesOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-white dark:bg-stone-800 border rounded-2xl p-2 w-48 shadow-xl z-50 text-stone-900 dark:text-stone-100">
                    {categories.map(cat => (
                      <button key={cat} onClick={() => { setSelectedCategory(cat === 'All' ? null : cat); setActiveView('products'); setIsCategoriesOpen(false); }} className="block w-full text-left px-4 py-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg">{cat}</button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {isLoadingRecommendations ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : recommendations.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-8">Recommended for You</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recommendations.map((book) => (
                    <div key={book.id} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex flex-col cursor-pointer hover:shadow-md transition" onClick={() => handleBookClick(book)}>
                      <img src={book.coverImageUrl || 'https://placehold.co/400x400?text=Book+Cover'} alt={book.title} className="aspect-square bg-stone-100 rounded-xl mb-4 object-cover" referrerPolicy="no-referrer" />
                      <h3 className="font-semibold mb-1">{book.title}</h3>
                      <p className="text-sm text-stone-500 mb-2">{book.author}</p>
                      <p className="text-golden-brown-700 font-bold mb-4">₦{book.price}</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleWishlist(book); }}
                        className={`w-full py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${wishlist.find(item => item.id === book.id) ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-900 hover:bg-stone-200'}`}
                      >
                        <Heart size={16} className={wishlist.find(item => item.id === book.id) ? 'fill-current' : ''} />
                        {wishlist.find(item => item.id === book.id) ? 'Wishlisted' : 'Wishlist'}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-2xl font-bold mb-8">
                {selectedCategory ? selectedCategory : searchQuery ? `Search Results for "${searchQuery}"` : 'Latest Products'}
              </h2>
              {activeView === 'wishlist' ? (
                wishlist.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {wishlist.map((book) => (
                      <div key={book.id} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex flex-col cursor-pointer hover:shadow-md transition" onClick={() => handleBookClick(book)}>
                        <img src={book.coverImageUrl || 'https://placehold.co/400x400?text=Book+Cover'} alt={book.title} className="aspect-square bg-stone-100 rounded-xl mb-4 object-cover" referrerPolicy="no-referrer" />
                        <h3 className="font-semibold mb-1">{book.title}</h3>
                        <p className="text-sm text-stone-500 mb-2">{book.author}</p>
                        <p className="text-golden-brown-700 font-bold mb-4">₦{book.price}</p>
                        <div className="flex flex-col gap-2 mt-auto">
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleWishlist(book); }}
                            className="w-full bg-red-100 text-red-500 py-2 rounded-lg text-sm font-semibold hover:bg-red-200 transition"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-500">Your wishlist is empty.</p>
                )
              ) : isSearching ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="aspect-square" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredBooks.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredBooks.slice((currentPage - 1) * booksPerPage, currentPage * booksPerPage).map((book) => (
                      <div key={book.id} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex flex-col cursor-pointer hover:shadow-md transition" onClick={() => handleBookClick(book)}>
                        <img src={book.coverImageUrl || 'https://placehold.co/400x400?text=Book+Cover'} alt={book.title} className="aspect-square bg-stone-100 rounded-xl mb-4 object-cover" referrerPolicy="no-referrer" />
                        <h3 className="font-semibold mb-1">{book.title}</h3>
                        <p className="text-sm text-stone-500 mb-2">{book.author}</p>
                        <p className="text-golden-brown-700 font-bold mb-4">₦{book.price}</p>
                        <div className="flex flex-col gap-2 mt-auto">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setQuickViewBook(book); }}
                            className="w-full bg-golden-brown-700 text-white py-2 rounded-lg text-sm font-semibold hover:bg-golden-brown-800 transition"
                          >
                            Quick View
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); addToCart(book); }}
                            disabled={addingToCart === book.id}
                            className="w-full bg-golden-brown-700 text-white py-2 rounded-lg text-sm font-semibold hover:bg-golden-brown-800 transition flex items-center justify-center gap-2"
                          >
                            {addingToCart === book.id ? <Loader2 className="animate-spin" size={16} /> : 'Add to Cart'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {booksToDisplay.length > booksPerPage && (
                    <div className="flex justify-center items-center gap-2 mt-8">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-xl bg-stone-100 text-stone-900 font-semibold hover:bg-stone-200 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-sm font-semibold">Page {currentPage} of {Math.ceil(booksToDisplay.length / booksPerPage)}</span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(booksToDisplay.length / booksPerPage), p + 1))}
                        disabled={currentPage === Math.ceil(booksToDisplay.length / booksPerPage)}
                        className="px-4 py-2 rounded-xl bg-stone-100 text-stone-900 font-semibold hover:bg-stone-200 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-stone-500 py-12">No books found matching your search.</p>
              )}
            </section>
          </>
        )}
      </main>

      {quickViewBook && (
        <div className="absolute top-20 left-0 w-full z-50 flex justify-center p-4">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl p-4 md:p-6 relative border border-stone-200 dark:border-stone-700 shadow-2xl flex flex-col md:flex-row gap-4 md:gap-6">
            <button 
              onClick={() => setQuickViewBook(null)}
              className="absolute -top-3 -right-3 p-2 bg-stone-900 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300 rounded-full shadow-xl transition z-10"
            >
              <X size={20} />
            </button>
            <div className="w-full md:w-1/3 shrink-0">
              <img src={quickViewBook.coverImageUrl || 'https://placehold.co/400x600?text=Book+Cover'} alt={quickViewBook.title} className="w-full aspect-[2/3] rounded-2xl object-cover shadow-md" referrerPolicy="no-referrer" />
            </div>
            <div className="w-full md:w-2/3 flex flex-col">
              <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-stone-900 dark:text-stone-100">{quickViewBook.title}</h2>
              <p className="text-base md:text-lg text-stone-600 dark:text-stone-400 mb-3 md:mb-4">{quickViewBook.author}</p>
              
              <div className="flex gap-2 md:gap-4 text-xs md:text-sm text-stone-500 dark:text-stone-400 mb-4 md:mb-6 font-mono border-y py-2 md:py-3 border-stone-100 dark:border-stone-800">
                <p>Published: {quickViewBook.publicationDate}</p>
                <p>•</p>
                <p>{quickViewBook.pageCount} pages</p>
              </div>
              
              <p className="text-golden-brown-700 dark:text-golden-brown-400 font-bold text-2xl md:text-3xl mb-4 md:mb-6">₦{quickViewBook.price}</p>
              
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">Synopsis</h3>
              <p className="text-sm md:text-base text-stone-700 dark:text-stone-300 mb-4 md:mb-8 leading-relaxed flex-grow">{quickViewBook.synopsis}</p>
              
              <button 
                onClick={() => { addToCart(quickViewBook); setQuickViewBook(null); }}
                disabled={addingToCart === quickViewBook.id}
                className="w-full bg-golden-brown-700 text-white py-3 md:py-4 rounded-xl font-bold hover:bg-golden-brown-800 transition flex items-center justify-center gap-2"
              >
                {addingToCart === quickViewBook.id ? <Loader2 className="animate-spin" size={18} /> : <><ShoppingCart size={18}/> Add to Cart</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full p-4 sm:p-6 flex flex-col text-black">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Your Cart</h2>
              <X className="cursor-pointer" onClick={() => setIsCartOpen(false)} />
            </div>
            <div className="flex-grow overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-4 mb-4 border-b pb-4">
                  <img src={item.coverImageUrl || 'https://placehold.co/400x400?text=Book+Cover'} alt={item.title} className="w-16 h-16 rounded-lg object-cover" referrerPolicy="no-referrer" />
                  <div className="flex-grow">
                    <h4 className="font-semibold">{item.title}</h4>
                    <p className="text-sm text-stone-600">{item.author}</p>
                    <p className="text-black font-bold">₦{item.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.id, -1)}><Minus size={16} /></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}><Plus size={16} /></button>
                    <button onClick={() => removeItem(item.id)} className="text-red-500 ml-2"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between font-bold text-lg mb-4">
                <span>Total:</span>
                <span>₦{totalPrice}</span>
              </div>
              <button onClick={startCheckout} className="w-full bg-golden-brown-700 text-white py-3 rounded-xl font-semibold">Checkout</button>
            </div>
          </div>
        </div>
      )}

      {isLoginOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Login</h2>
              <X className="cursor-pointer" onClick={() => setIsLoginOpen(false)} />
            </div>
            <div className="space-y-6">
              <input type="email" placeholder="Email" className="w-full p-4 border rounded-xl" />
              <input type="password" placeholder="Password" className="w-full p-4 border rounded-xl" />
              <button className="w-full bg-stone-900 text-white py-4 rounded-xl font-semibold">Login</button>
            </div>
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 md:p-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-black">Checkout</h2>
              <button onClick={() => setIsCheckoutOpen(false)} className="bg-stone-100 px-4 py-2 md:px-6 md:py-3 rounded-xl font-semibold hover:bg-stone-200 text-black">Close</button>
            </div>
            
            <div className="mb-8 flex justify-between text-xs md:text-sm font-semibold text-black">
              <span className={checkoutStep >= 1 ? 'text-golden-brown-700' : ''}>1. Shipping</span>
              <ChevronRight size={16} />
              <span className={checkoutStep >= 2 ? 'text-golden-brown-700' : ''}>2. Payment</span>
              <ChevronRight size={16} />
              <span className={checkoutStep >= 3 ? 'text-golden-brown-700' : ''}>3. Confirm</span>
            </div>

            {checkoutStep === 1 && (
              <div className="space-y-4">
                <input type="text" placeholder="Full Name" className="w-full p-3 md:p-4 border rounded-xl text-black" />
                <input type="text" placeholder="Address" className="w-full p-3 md:p-4 border rounded-xl text-black" />
                <input type="text" placeholder="City" className="w-full p-3 md:p-4 border rounded-xl text-black" />
                <button onClick={() => setCheckoutStep(2)} className="w-full bg-stone-900 text-white py-3 md:py-4 rounded-xl font-semibold">Next</button>
              </div>
            )}

            {checkoutStep === 2 && (
              <div className="space-y-4 text-black">
                <label className="flex items-center gap-3 p-4 border rounded-xl">
                  <input type="radio" name="payment" /> Credit Card
                </label>
                <label className="flex items-center gap-3 p-4 border rounded-xl">
                  <input type="radio" name="payment" /> Bank Transfer
                </label>
                <button onClick={() => setCheckoutStep(3)} className="w-full bg-stone-900 text-white py-3 md:py-4 rounded-xl font-semibold">Next</button>
              </div>
            )}

            {checkoutStep === 3 && (
              <div className="text-center space-y-4 text-black">
                <CheckCircle className="w-16 h-16 text-golden-brown-700 mx-auto" />
                <h3 className="text-xl font-bold">Confirm Order</h3>
                <button onClick={finishCheckout} className="w-full bg-golden-brown-700 text-white py-3 rounded-xl font-semibold">Place Order</button>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmedOrder && (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Order Confirmed!</h2>
              <button 
                onClick={() => setConfirmedOrder(null)} 
                className="bg-stone-100 px-6 py-3 rounded-xl font-semibold hover:bg-stone-200"
              >
                Close
              </button>
            </div>
            
            <div className="bg-stone-50 p-6 rounded-2xl border mb-8">
              <div className="flex justify-between mb-4">
                <p className="font-semibold">Order #{confirmedOrder.id}</p>
                <p className="text-stone-500">{confirmedOrder.date}</p>
              </div>
              <div className="space-y-3">
                {confirmedOrder.items.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span>{item.title} (x{item.quantity})</span>
                    <span>₦{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-4 pt-4 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₦{confirmedOrder.totalPrice}</span>
              </div>
            </div>
            
            <button 
              onClick={() => setConfirmedOrder(null)} 
              className="w-full bg-stone-900 text-white py-4 rounded-xl font-semibold hover:bg-golden-brown-800 transition"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      <footer className="border-t border-stone-200 mt-20 py-16 text-center text-sm text-stone-500">
        <div className="flex justify-center gap-6 mb-4">
          <a href="https://www.instagram.com/khentibooks/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 flex items-center gap-2">
            <Instagram size={18} /> Instagram
          </a>
          <a href="tel:+2348104972574" className="hover:underline flex items-center gap-2">
            <Phone size={18} /> Phone: +234 810 497 2574
          </a>
        </div>
        Built with ❤️ by <a href="https://www.scaleupfoundation.org/" target="_blank" rel="noopener noreferrer" className="text-golden-brown-700 hover:underline">Scaleup Foundation</a>
      </footer>

      {/* Back to Top Button */}
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-24 right-6 bg-golden-brown-700 text-white p-3 rounded-full shadow-lg hover:bg-golden-brown-800 transition z-50"
      >
        <ChevronUp size={24} />
      </button>

      {/* WhatsApp Customer Care Button */}
      <a 
        href="https://wa.me/2348104972574" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-green-500 text-white p-3 rounded-full shadow-lg hover:bg-green-600 transition z-50 flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.148-.67-1.613-.918-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.005 0C5.37 0 .002 5.368.002 12.006c0 2.092.548 4.136 1.59 5.925L0 24l6.339-1.664a11.78 11.78 0 005.666 1.443h.005c6.635 0 12.003-5.368 12.003-12.005 0-3.207-1.248-6.229-3.518-8.498"/>
        </svg>
      </a>
    </div>
  );
}
