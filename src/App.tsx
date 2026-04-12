/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { BookOpen, ShoppingCart, Search, Menu, X, Plus, Minus, Trash2, ChevronRight, CheckCircle, ArrowLeft, Loader2, Sun, Moon } from 'lucide-react';
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
      synopsis: 'A story of wealth, love, and the American Dream in the 1920s.',
      authorBio: 'F. Scott Fitzgerald was an American novelist and short story writer.',
      reviews: [{ user: 'Alice', comment: 'A classic!', rating: 5 }],
      coverImageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80'
    },
    { 
      id: 2, 
      title: 'To Kill a Mockingbird', 
      author: 'Harper Lee', 
      price: 3000,
      synopsis: 'A powerful story about racial injustice and loss of innocence in the American South.',
      authorBio: 'Harper Lee was an American novelist best known for this book.',
      reviews: [{ user: 'Bob', comment: 'Must read.', rating: 5 }],
      coverImageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80'
    },
    { 
      id: 3, 
      title: '1984', 
      author: 'George Orwell', 
      price: 2800,
      synopsis: 'A dystopian novel about a totalitarian regime.',
      authorBio: 'George Orwell was an English novelist and essayist.',
      reviews: [{ user: 'Charlie', comment: 'Terrifyingly relevant.', rating: 4 }],
      coverImageUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=400&q=80'
    },
    { 
      id: 4, 
      title: 'Pride and Prejudice', 
      author: 'Jane Austen', 
      price: 3500,
      synopsis: 'A romantic novel of manners.',
      authorBio: 'Jane Austen was an English novelist known for her six major novels.',
      reviews: [{ user: 'Diana', comment: 'So romantic!', rating: 5 }],
      coverImageUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=400&q=80'
    },
  ]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeView, setActiveView] = useState<'products' | 'orders'>('products');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
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
  const [currentPage, setCurrentPage] = useState(1);
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
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const startCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
    setCheckoutStep(1);
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
    setCart([]);
  };

  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
    setViewedBooks(prev => [...new Set([...prev, book.id])]);
  };

  return (
    <div className={`min-h-screen font-sans ${theme === 'dark' ? 'bg-stone-900 text-stone-100' : 'bg-stone-50 text-stone-900'}`}>
      <header className={`sticky top-0 z-50 border-b ${theme === 'light' ? 'bg-stone-900 text-white' : 'bg-stone-800 text-white border-stone-700'}`}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedBook(null)}>
            <BookOpen className="w-8 h-8 text-golden-brown-500" />
            <span className="text-xl font-bold tracking-tight">Khenti Books</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button onClick={() => setActiveView('products')} className="hover:text-golden-brown-400">Shop All</button>
            <button onClick={() => setActiveView('orders')} className="hover:text-golden-brown-400">Orders</button>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full hover:bg-stone-700">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button onClick={() => setIsLoginOpen(true)} className="text-sm font-medium hover:text-golden-brown-400">Login</button>
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
                className="pl-9 pr-4 py-1.5 rounded-full border border-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-golden-brown-500 bg-stone-800 text-white"
              />
            </div>
            <div className="relative cursor-pointer" onClick={() => setIsCartOpen(true)}>
              <ShoppingCart className="w-5 h-5 hover:text-golden-brown-700" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-golden-brown-700 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </div>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full hover:bg-stone-100">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <Menu className="md:hidden w-5 h-5 cursor-pointer" />
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {activeView === 'orders' ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Order History</h2>
            {orders.length === 0 ? (
              <p className="text-stone-500">No orders found.</p>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 dark:bg-stone-800 dark:border-stone-700">
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
            <section className="bg-golden-brown-800 text-white rounded-3xl p-8 md:p-16 mb-12">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">Welcome to Khenti Books</h1>
              <p className="text-lg md:text-xl text-golden-brown-100 mb-8">Read, grow, repeat!</p>
              <button className="bg-white text-golden-brown-800 px-6 py-3 rounded-full font-semibold hover:bg-golden-brown-50 transition">
                Shop Now
              </button>
            </section>

            {isLoadingRecommendations ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {recommendations.map((book) => (
                    <div key={book.id} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex flex-col cursor-pointer hover:shadow-md transition" onClick={() => handleBookClick(book)}>
                      <img src={book.coverImageUrl || 'https://placehold.co/400x400?text=Book+Cover'} alt={book.title} className="aspect-square bg-stone-100 rounded-xl mb-4 object-cover" referrerPolicy="no-referrer" />
                      <h3 className="font-semibold mb-1">{book.title}</h3>
                      <p className="text-sm text-stone-500 mb-2">{book.author}</p>
                      <p className="text-golden-brown-700 font-bold mb-4">₦{book.price}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-2xl font-bold mb-8">
                {searchQuery ? `Search Results for "${searchQuery}"` : 'Latest Products'}
              </h2>
              {isSearching ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {filteredBooks.slice((currentPage - 1) * booksPerPage, currentPage * booksPerPage).map((book) => (
                      <div key={book.id} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex flex-col cursor-pointer hover:shadow-md transition dark:bg-stone-800 dark:border-stone-700" onClick={() => handleBookClick(book)}>
                        <img src={book.coverImageUrl || 'https://placehold.co/400x400?text=Book+Cover'} alt={book.title} className="aspect-square bg-stone-100 rounded-xl mb-4 object-cover dark:bg-stone-700" referrerPolicy="no-referrer" />
                        <h3 className="font-semibold mb-1 dark:text-white">{book.title}</h3>
                        <p className="text-sm text-stone-500 mb-2 dark:text-stone-400">{book.author}</p>
                        <p className="text-golden-brown-700 font-bold mb-4">₦{book.price}</p>
                        <div className="flex gap-2 mt-auto">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setQuickViewBook(book); }}
                            className="flex-1 bg-stone-100 text-stone-900 py-2 rounded-xl text-sm font-semibold hover:bg-stone-200 transition dark:bg-stone-700 dark:text-white dark:hover:bg-stone-600"
                          >
                            Quick View
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); addToCart(book); }}
                            disabled={addingToCart === book.id}
                            className="flex-1 bg-stone-900 text-white py-2 rounded-xl text-sm font-semibold hover:bg-golden-brown-800 transition flex items-center justify-center gap-2 dark:bg-golden-brown-700 dark:hover:bg-golden-brown-800"
                          >
                            {addingToCart === book.id ? <Loader2 className="animate-spin" size={16} /> : 'Add to Cart'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredBooks.length > booksPerPage && (
                    <div className="flex justify-center items-center gap-2 mt-8">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-xl bg-stone-100 text-stone-900 font-semibold hover:bg-stone-200 disabled:opacity-50 dark:bg-stone-700 dark:text-white dark:hover:bg-stone-600"
                      >
                        Previous
                      </button>
                      <span className="text-sm font-semibold dark:text-white">Page {currentPage} of {Math.ceil(filteredBooks.length / booksPerPage)}</span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredBooks.length / booksPerPage), p + 1))}
                        disabled={currentPage === Math.ceil(filteredBooks.length / booksPerPage)}
                        className="px-4 py-2 rounded-xl bg-stone-100 text-stone-900 font-semibold hover:bg-stone-200 disabled:opacity-50 dark:bg-stone-700 dark:text-white dark:hover:bg-stone-600"
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
        <div className="absolute top-0 left-0 w-full z-50 flex justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-8 relative dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xl">
            <div className="flex justify-end mb-4">
              <button onClick={() => setQuickViewBook(null)} className="bg-stone-100 text-stone-900 px-4 py-2 rounded-xl font-semibold hover:bg-stone-200 dark:bg-stone-700 dark:text-white dark:hover:bg-stone-600">Close</button>
            </div>
            <div className="w-full aspect-square bg-stone-100 rounded-xl mb-4 overflow-hidden dark:bg-stone-700">
              <img src={quickViewBook.coverImageUrl || 'https://placehold.co/400x400?text=Book+Cover'} alt={quickViewBook.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <h2 className="text-2xl font-bold mb-2 dark:text-white">{quickViewBook.title}</h2>
            <p className="text-stone-600 mb-4 dark:text-stone-300">{quickViewBook.author}</p>
            <p className="text-golden-brown-700 font-bold text-xl mb-6">₦{quickViewBook.price}</p>
            <p className="text-stone-700 mb-6 dark:text-stone-400">{quickViewBook.synopsis}</p>
            <button 
              onClick={() => { addToCart(quickViewBook); setQuickViewBook(null); }}
              disabled={addingToCart === quickViewBook.id}
              className="w-full bg-stone-900 text-white py-3 rounded-xl font-semibold hover:bg-golden-brown-800 transition flex items-center justify-center gap-2 dark:bg-golden-brown-700 dark:hover:bg-golden-brown-800"
            >
              {addingToCart === quickViewBook.id ? <Loader2 className="animate-spin" size={20} /> : 'Add to Cart'}
            </button>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full p-6 flex flex-col">
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
                    <p className="text-sm text-stone-500">{item.author}</p>
                    <p className="text-golden-brown-700 font-bold">₦{item.price}</p>
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
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 dark:bg-stone-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Login</h2>
              <X className="cursor-pointer" onClick={() => setIsLoginOpen(false)} />
            </div>
            <div className="space-y-4">
              <input type="email" placeholder="Email" className="w-full p-3 border rounded-xl dark:bg-stone-700 dark:border-stone-600 dark:text-white" />
              <input type="password" placeholder="Password" className="w-full p-3 border rounded-xl dark:bg-stone-700 dark:border-stone-600 dark:text-white" />
              <button className="w-full bg-golden-brown-700 text-white py-3 rounded-xl font-semibold">Login</button>
            </div>
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-8 dark:bg-stone-800">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-black dark:text-black">Checkout</h2>
              <button onClick={() => setIsCheckoutOpen(false)} className="bg-stone-100 text-black px-4 py-2 rounded-xl font-semibold hover:bg-stone-200">Close</button>
            </div>
            
            <div className="mb-8 flex justify-between text-sm font-semibold text-black dark:text-black">
              <span className={checkoutStep >= 1 ? 'text-golden-brown-700' : ''}>1. Shipping</span>
              <ChevronRight size={16} />
              <span className={checkoutStep >= 2 ? 'text-golden-brown-700' : ''}>2. Payment</span>
              <ChevronRight size={16} />
              <span className={checkoutStep >= 3 ? 'text-golden-brown-700' : ''}>3. Confirm</span>
            </div>

            {checkoutStep === 1 && (
              <div className="space-y-4">
                <input type="text" placeholder="Full Name" className="w-full p-3 border rounded-xl text-black" />
                <input type="text" placeholder="Address" className="w-full p-3 border rounded-xl text-black" />
                <input type="text" placeholder="City" className="w-full p-3 border rounded-xl text-black" />
                <button onClick={() => setCheckoutStep(2)} className="w-full bg-golden-brown-700 text-white py-3 rounded-xl font-semibold">Next</button>
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
                <button onClick={() => setCheckoutStep(3)} className="w-full bg-golden-brown-700 text-white py-3 rounded-xl font-semibold">Next</button>
              </div>
            )}

            {checkoutStep === 3 && (
              <div className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-golden-brown-700 mx-auto" />
                <h3 className="text-xl font-bold">Order Confirmed!</h3>
                <p className="text-stone-500">Thank you for your purchase.</p>
                <button onClick={finishCheckout} className="w-full bg-golden-brown-700 text-white py-3 rounded-xl font-semibold">Finish</button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="border-t border-stone-200 mt-12 py-8 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
        Built with ❤️ by <a href="https://www.scaleupfoundation.org/" target="_blank" rel="noopener noreferrer" className="text-golden-brown-700 hover:underline">Scaleup Foundation</a>
      </footer>
    </div>
  );
}
