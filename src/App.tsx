/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Book, CartItem, Order } from './types';
import { books } from './data/books';
import { ShoppingCart, Search, Menu, X, Plus, Minus, Trash2, ChevronRight, CheckCircle, ArrowLeft, Loader2, Sun, Moon, Heart, ChevronUp, MessageCircle, Instagram, Phone, ChevronDown } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Skeleton } from './components/Skeleton';
import { onAuthStateChanged, signOut, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updatePassword, updateProfile } from 'firebase/auth';
import { auth } from './lib/firebase';


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });


export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Standardized error handler
  const handleError = (error: any, context: string) => {
    console.error(`${context} error:`, error);
    
    let message = '';
    
    // Check if it's a firebase auth error
    if (error.code && typeof error.code === 'string' && error.code.startsWith('auth/')) {
       switch(error.code) {
         case 'auth/email-already-in-use':
           message = 'This email is already in use. Please use a different email or login.';
           break;
         case 'auth/invalid-credential':
           message = 'Invalid email or password.';
           break;
         case 'auth/weak-password':
           message = 'Password should be at least 6 characters.';
           break;
         case 'auth/user-not-found':
           message = 'No account found with this email.';
           break;
         case 'auth/too-many-requests':
           message = 'Too many requests. Please try again later.';
           break;
         default:
           message = 'An authentication error occurred: ' + error.code;
       }
    } else if (error.message) {
      message = error.message;
    } else {
      message = 'An unexpected error occurred: ' + String(error);
    }
    setError(message);
  }

  const handleAuth = async () => {
    setIsAuthLoading(true);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: `${firstName} ${lastName}` });
        setSuccessMessage('Registration successful! Welcome.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccessMessage('Login successful! Welcome back.');
      }
      setIsLoginOpen(false);
      setEmail('');
      setPassword('');
      setError(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      handleError(err, 'Authentication');
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const [booksState, setBooks] = useState<Book[]>(books);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeView, setActiveView] = useState<'products' | 'orders'>('products');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000]);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, 2026]);
  const [pageCountRange, setPageCountRange] = useState<[number, number]>([0, 1000]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  
  const getYear = (dateStr: string): number => {
    const yearMatch = dateStr.match(/\d{4}/);
    return yearMatch ? parseInt(yearMatch[0], 10) : 0;
  };
  const [quickViewBook, setQuickViewBook] = useState<Book | null>(null);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [addingToCart, setAddingToCart] = useState<number | null>(null);
  const [newReview, setNewReview] = useState({ user: '', comment: '', rating: 5 });
  const [isSearching, setIsSearching] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({ name: '', address: '', city: '' });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const booksPerPage = 12;

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

  const [suggestions, setSuggestions] = useState<Book[]>([]);

  // Update suggestions dynamically in an effect
  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = booksState.filter((book) =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, booksState]);

  // Poll payment status
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (paymentReference) {
      interval = setInterval(async () => {
        try {
          const response = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: paymentReference })
          });
          const data = await response.json();
          if (data.success) {
            setCheckoutStep(3);
            setPaymentReference(null);
            if (interval) clearInterval(interval);
          }
        } catch (err) {
          console.error('Polling verification failed', err);
        }
      }, 5000); // 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [paymentReference]);

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address to reset password');
      return;
    }
    setError(null);
    setSuccessMessage(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Password reset email sent. Please check your inbox.');
    } catch (err: any) {
      handleError(err, 'Password reset');
    }
  };


  const toTitleCase = (str: string) => {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const filteredBooks = useMemo(() => {
    const processedBooks = booksState.map(book => ({...book, synopsis: book.synopsis.replace(/ - /g, ', ')}));
    
    const baseFilteredBooks = processedBooks.filter((book) => {
        const query = searchQuery.toLowerCase();
        // Base filtering
        const categoryMatch = !selectedCategory || selectedCategory === 'All books' || book.category === selectedCategory.toUpperCase() || book.category === toTitleCase(selectedCategory);
        const authorMatch = !selectedAuthor || book.author === selectedAuthor;
        const priceMatch = book.price >= priceRange[0] && book.price <= priceRange[1];
        const year = getYear(book.publicationDate);
        const yearMatch = year >= yearRange[0] && year <= yearRange[1];
        const pagesMatch = book.pageCount >= pageCountRange[0] && book.pageCount <= pageCountRange[1];
  
        // Search filtering
        const searchMatch = !query || 
          book.title.toLowerCase().includes(query) || 
          book.author.toLowerCase().includes(query) ||
          book.synopsis.toLowerCase().includes(query);
  
        return categoryMatch && authorMatch && priceMatch && searchMatch && yearMatch && pagesMatch;
    });

    let result = baseFilteredBooks;
    
    // De-duplicate if "All books" is selected, or if there is a search query
    if (selectedCategory === 'All books' || searchQuery.trim() !== '') {
        result = baseFilteredBooks.filter((book, index, self) =>
            index === self.findIndex((b) => (
                b.title.trim().toLowerCase() === book.title.trim().toLowerCase() &&
                b.author.trim().toLowerCase() === book.author.trim().toLowerCase()
            ))
        );
    }
    
    return result.sort((a, b) => {
        if (!searchQuery) return 0;
        const query = searchQuery.toLowerCase();
  
        const getScore = (book: Book) => {
          let score = 0;
          const title = book.title.toLowerCase();
          const author = book.author.toLowerCase();
          const synopsis = book.synopsis.toLowerCase();
  
          if (title === query) score += 100; // Exact title match
          else if (title.includes(query)) score += 50; // Partial title match
          
          if (author.includes(query)) score += 30; // Partial author match
          if (synopsis.includes(query)) score += 10; // Partial synopsis match
          
          return score;
        };
  
        return getScore(b) - getScore(a);
      });
  }, [booksState, searchQuery, selectedCategory, selectedAuthor, priceRange, yearRange, pageCountRange]);

  const categories = useMemo(() => ['All books', ...new Set(booksState.map(b => toTitleCase(b.category)))], [booksState]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const startCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
    setCheckoutStep(1);
    setPaymentReference(null);
  };

  const finishCheckout = () => {
    const newOrder: Order = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      totalPrice: totalPrice,
      items: [...cart],
    };
    setOrders(prev => [...prev, newOrder]);
    setIsCheckoutOpen(false); 
    setConfirmedOrder(newOrder);
    setCart([]);
  };

  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
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
      <div className="bg-golden-brown-800 text-white text-xs font-bold md:font-extrabold py-2 px-6 flex justify-center">
        {user ? 'HEY READER, WELCOME TO KHENTI BOOKS' : 'WELCOME TO KHENTI BOOKS'}
      </div>
      <header className="sticky top-0 z-50 border-b bg-white border-stone-200 dark:bg-stone-900 dark:border-stone-700">
        <nav className="w-full max-w-7xl mx-auto px-2 py-2 flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => { setSelectedBook(null); setActiveView('products'); setSelectedCategory('All books'); setSearchQuery(''); }}>
              <img src="https://i.imgur.com/q7x9LEj.png" alt="Logo" className="w-16 h-16 md:w-32 md:h-32 object-contain" />
          </div>
          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            {user ? (
              <div className="hidden md:flex items-center gap-4 mr-4">
                <button onClick={() => setActiveView('orders')} className="text-[11px] font-bold text-white hover:text-golden-brown-200">Orders</button>
                <button onClick={() => signOut(auth)} className="text-[11px] font-bold text-white hover:text-golden-brown-200">Logout</button>
              </div>
            ) : (
              <>
                <button onClick={() => setActiveView('orders')} className="hidden md:block text-[11px] font-bold text-white hover:text-golden-brown-200 mr-4">Orders</button>
                <button onClick={() => setIsLoginOpen(true)} className="hidden md:block text-[11px] font-bold text-white hover:text-golden-brown-200 mr-4">Login</button>
              </>
            )}
            <div className="relative">
              <Search className="w-5 h-5 absolute left-2 top-1/2 -translate-y-1/2 text-white" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearching(true);
                  setTimeout(() => setIsSearching(false), 500);
                }}
                className="w-24 md:w-48 pl-8 pr-2 py-1 rounded-full border border-stone-300 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-golden-brown-500 bg-transparent text-white placeholder-white"
              />
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-full md:w-64 bg-stone-900 border border-stone-700 rounded-lg shadow-lg z-50">
                  {suggestions.map((book) => (
                    <div
                      key={book.id}
                      className="px-4 py-2 hover:bg-stone-800 cursor-pointer text-sm text-white"
                      onClick={() => {
                        setSearchQuery(book.title);
                        setSuggestions([]);
                      }}
                    >
                      {book.title}
                    </div>
                  ))}
                </div>
              )}
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
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800">
              <Menu className="w-5 h-5 dark:text-white" />
            </button>
          </div>
        </nav>
        {isMobileMenuOpen && (
          <div className="md:hidden border-t p-4 bg-white dark:bg-stone-900 flex flex-col gap-2 items-end w-24 ml-auto">
             <button onClick={() => { setActiveView('orders'); setIsMobileMenuOpen(false); }} className="text-right py-2 font-semibold text-white text-[11px]">Orders</button>
             {user ? (
               <>
                 <button onClick={() => { signOut(auth); setIsMobileMenuOpen(false); }} className="text-right py-2 font-semibold text-white text-[11px]">Logout</button>
               </>
             ) : (
               <button onClick={() => { setIsLoginOpen(true); setIsMobileMenuOpen(false); }} className="text-right py-2 font-semibold text-white text-[11px]">Login</button>
             )}
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
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6 text-center" role="alert">
            <p className="font-bold text-lg">Success</p>
            <p className="text-sm">Welcome to Khenti Books</p>
            <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setSuccessMessage(null)}>
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {activeView === 'orders' ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Order History</h2>
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
            <div className="grid md:grid-cols-2 gap-12 max-w-5xl">
              <img src={selectedBook.coverImageUrl || 'https://placehold.co/400x400?text=Book+Cover'} alt={selectedBook.title} className="w-full aspect-[3/4] bg-stone-100 rounded-3xl object-cover" referrerPolicy="no-referrer" />
              <div className="space-y-6">
                <h1 className="text-4xl font-bold">{selectedBook.title}</h1>
                <p className="text-xl text-stone-600">{selectedBook.author}</p>
                <p className="text-2xl font-bold text-golden-brown-700">₦{selectedBook.price}</p>
                <div className="max-h-[400px] overflow-y-auto pr-2">
                  <p className="text-stone-700 leading-relaxed">{selectedBook.synopsis}</p>
                </div>
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
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-8 whitespace-nowrap -ml-4">Read. Grow. Repeat.</h1>
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

            <section>
              <h2 className="text-2xl font-bold mb-8">
                {selectedCategory ? selectedCategory : searchQuery ? `Search Results for "${searchQuery}"` : 'All books'}
              </h2>

              {(isSearching || loading) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col items-center w-full mx-auto">
                      <Skeleton className="w-32 h-48 mb-4" />
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/2 mb-2" />
                      <Skeleton className="h-4 w-1/3 mb-4" />
                      <div className="flex flex-col gap-2 mt-auto w-full">
                        <Skeleton className="h-8 w-full rounded-lg" />
                        <Skeleton className="h-8 w-full rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredBooks.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredBooks.slice((currentPage - 1) * booksPerPage, currentPage * booksPerPage).map((book) => (
                      <div key={book.id} className="bg-white dark:bg-stone-800 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700 flex flex-col items-center cursor-pointer hover:shadow-lg transition-all duration-300 w-full mx-auto" onClick={() => handleBookClick(book)}>
                        <img src={book.coverImageUrl || 'https://placehold.co/400x400?text=Book+Cover'} alt={book.title} className="w-32 h-48 rounded-lg mb-4 object-cover shadow-md" referrerPolicy="no-referrer" />
                        <h3 className="font-semibold mb-1 text-center text-sm w-full truncate dark:text-stone-100">{book.title}</h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">{book.author}</p>
                        <p className="text-golden-brown-700 font-bold mb-4 text-sm">₦{book.price.toLocaleString()}</p>
                        <div className="flex flex-col gap-2 mt-auto w-full">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setQuickViewBook(book); }}
                            className="w-full bg-golden-brown-700 text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-golden-brown-800 transition"
                          >
                            Quick View
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); addToCart(book); }}
                            disabled={addingToCart === book.id}
                            className="w-full bg-stone-900 text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-stone-700 transition flex items-center justify-center gap-2"
                          >
                            {addingToCart === book.id ? <Loader2 className="animate-spin" size={14} /> : 'Add to Cart'}
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
                        className="px-4 py-2 rounded-xl bg-stone-100 text-stone-900 font-semibold hover:bg-stone-200 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-sm font-semibold">Page {currentPage} of {Math.ceil(filteredBooks.length / booksPerPage)}</span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredBooks.length / booksPerPage), p + 1))}
                        disabled={currentPage === Math.ceil(filteredBooks.length / booksPerPage)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setQuickViewBook(null)} />
          <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-2xl p-6 relative border border-stone-100 dark:border-stone-800 shadow-xl flex flex-col gap-4 z-10">
            <button 
              onClick={() => setQuickViewBook(null)}
              className="absolute top-4 right-4 p-2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-full transition z-20"
            >
              <X size={20} />
            </button>
            <div className="flex gap-6">
              <div className="w-32 shrink-0">
                <img src={quickViewBook.coverImageUrl || 'https://placehold.co/400x600?text=Book+Cover'} alt={quickViewBook.title} className="w-full aspect-[2/3] rounded-lg object-cover shadow-sm" referrerPolicy="no-referrer" />
              </div>
              <div className="flex flex-col justify-center gap-1">
                <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 leading-tight mb-1">{quickViewBook.title}</h2>
                <p className="text-sm text-stone-600 dark:text-stone-400 mb-2">{quickViewBook.author}</p>
                <div className="flex gap-2 text-xs text-stone-500 dark:text-stone-400 font-mono mb-2">
                  <span>{quickViewBook.publicationDate}</span>
                  <span>•</span>
                  <span>{quickViewBook.pageCount} pages</span>
                </div>
                <p className="text-golden-brown-700 dark:text-golden-brown-400 font-bold text-lg">₦{quickViewBook.price.toLocaleString()}</p>
              </div>
            </div>
            
            <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed overflow-y-auto max-h-40">{quickViewBook.synopsis}</p>
            
            <button 
              onClick={() => { addToCart(quickViewBook); setQuickViewBook(null); }}
              disabled={addingToCart === quickViewBook.id}
              className="w-full bg-golden-brown-700 text-white py-3 rounded-lg font-semibold hover:bg-golden-brown-800 transition flex items-center justify-center gap-2 text-sm"
            >
              {addingToCart === quickViewBook.id ? <Loader2 className="animate-spin" size={18} /> : <><ShoppingCart size={18}/> Add to Cart</>}
            </button>
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
          <div className="bg-white w-full max-w-sm rounded-3xl p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-stone-900">{isRegistering ? 'Register' : 'Login'}</h2>
              <X className="cursor-pointer text-stone-900" onClick={() => setIsLoginOpen(false)} />
            </div>
            <div className="space-y-6">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 border rounded-xl text-stone-900 placeholder:text-stone-500" />
              {isRegistering && (
                <>
                  <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full p-4 border rounded-xl text-stone-900 placeholder:text-stone-500" />
                  <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full p-4 border rounded-xl text-stone-900 placeholder:text-stone-500" />
                </>
              )}
              
              {!isForgotPassword ? (
                <>
                  <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 border rounded-xl text-stone-900 placeholder:text-stone-500" />
                  <button onClick={handleAuth} disabled={isAuthLoading} className="w-full bg-stone-900 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
                    {isAuthLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isRegistering ? 'Register' : 'Login'}
                  </button>
                  {!isRegistering && (
                    <button onClick={() => setIsForgotPassword(true)} className="w-full text-sm text-stone-600 hover:underline mt-2">Forgot Password?</button>
                  )}
                  <button onClick={() => setIsRegistering(!isRegistering)} className="w-full text-sm text-stone-600 hover:underline">
                     {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleForgotPassword} className="w-full bg-stone-900 text-white py-4 rounded-xl font-semibold">Send Reset Link</button>
                  <button onClick={() => setIsForgotPassword(false)} className="w-full text-sm text-stone-600 hover:underline">Back to Login</button>
                </>
              )}
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
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
            
            <div className="mb-8 flex justify-between items-center text-xs font-semibold text-stone-400">
              <span className={`flex items-center gap-1 ${checkoutStep >= 1 ? 'text-golden-brown-700' : ''}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${checkoutStep >= 1 ? 'border-golden-brown-700 bg-golden-brown-50' : 'border-stone-300'}`}>1</span>
                Shipping
              </span>
              <div className="h-0.5 flex-1 mx-2 bg-stone-200"></div>
              <span className={`flex items-center gap-1 ${checkoutStep >= 2 ? 'text-golden-brown-700' : ''}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${checkoutStep >= 2 ? 'border-golden-brown-700 bg-golden-brown-50' : 'border-stone-300'}`}>2</span>
                Payment
              </span>
              <div className="h-0.5 flex-1 mx-2 bg-stone-200"></div>
              <span className={`flex items-center gap-1 ${checkoutStep >= 3 ? 'text-golden-brown-700' : ''}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${checkoutStep >= 3 ? 'border-golden-brown-700 bg-golden-brown-50' : 'border-stone-300'}`}>3</span>
                Confirm
              </span>
            </div>

            {checkoutStep === 1 && (
              <div className="space-y-4">
                <input type="text" placeholder="Full Name" value={shippingInfo.name} onChange={(e) => setShippingInfo({...shippingInfo, name: e.target.value})} className="w-full p-4 border rounded-xl text-black" />
                <input type="text" placeholder="Address" value={shippingInfo.address} onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})} className="w-full p-4 border rounded-xl text-black" />
                <input type="text" placeholder="City" value={shippingInfo.city} onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})} className="w-full p-4 border rounded-xl text-black" />
                <button 
                  onClick={() => {
                    if (!shippingInfo.name || !shippingInfo.address || !shippingInfo.city) {
                      alert('Please fill in all shipping fields');
                      return;
                    }
                    setCheckoutStep(2);
                  }} 
                  className="w-full bg-stone-900 text-white py-4 rounded-xl font-semibold hover:bg-stone-800"
                >
                  Next
                </button>
              </div>
            )}

            {checkoutStep === 2 && (
              <div className="space-y-4 text-black">
                <label className="flex items-center gap-3 p-4 border rounded-xl">
                  <input type="radio" name="payment" value="card" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} /> Credit Card
                </label>
                <label className="flex items-center gap-3 p-4 border rounded-xl">
                  <input type="radio" name="payment" value="transfer" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} /> Bank Transfer
                </label>
                <button 
                  disabled={isProcessingPayment}
                  onClick={async () => {
                    setPaymentError(null);
                    if (paymentMethod === 'card' || paymentMethod === 'transfer') {
                      setIsProcessingPayment(true);
                      try {
                        const popup = window.open('about:blank', 'PaystackCheckout', 'width=500,height=700,status=no,resizable=yes,toolbar=no,menubar=no,location=no');
                        const response = await fetch('/api/initialize-payment', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            email: user?.email || 'customer@example.com', 
                            amount: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
                            metadata: { orderId: 'temp_order_id', shipping: shippingInfo, method: paymentMethod }
                          })
                        });
                        const data = await response.json();
                        if (data.status && data.data.authorization_url) {
                          setPaymentReference(data.data.reference);
                          if (popup) {
                            popup.location.href = data.data.authorization_url;
                          } else {
                            window.open(data.data.authorization_url, '_blank');
                          }
                        } else {
                          if (popup) popup.close();
                          setPaymentError('Failed to initialize payment, please try again.');
                        }
                      } catch (err) {
                        handleError(err, 'Payment initialization');
                      } finally {
                        setIsProcessingPayment(false);
                      }
                    } else {
                      setCheckoutStep(3);
                    }
                  }} 
                  className="w-full bg-stone-900 text-white py-4 rounded-xl font-semibold hover:bg-stone-800 disabled:opacity-50"
                >
                  {isProcessingPayment ? 'Processing...' : (paymentReference ? 'Pay Now (Open Paystack)' : 'Proceed to Payment')}
                </button>
                {paymentReference && (
                  <button
                    onClick={async () => {
                       setPaymentError(null);
                       setVerifyingPayment(true);
                       try {
                         const response = await fetch('/api/verify-payment', {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({ reference: paymentReference })
                         });
                         const data = await response.json();
                         if (data.success) {
                           setCheckoutStep(3);
                         } else {
                           setPaymentError('Payment verification failed. Please contact support if you have already been charged.');
                         }
                       } catch (err) {
                         console.error('Verification failed', err);
                         setPaymentError('Failed to verify payment status. Please try again or contact support.');
                       } finally {
                         setVerifyingPayment(false);
                       }
                    }}
                    disabled={verifyingPayment}
                    className="w-full bg-golden-brown-700 text-white py-3 md:py-4 rounded-xl font-semibold mt-2"
                  >
                    {verifyingPayment ? 'Verifying...' : 'I have finished paying'}
                  </button>
                )}
                {paymentError && (
                  <p className="text-red-500 text-sm mt-2">{paymentError}</p>
                )}
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
