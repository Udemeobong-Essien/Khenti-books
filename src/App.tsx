/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Search, Menu, X, Plus, Minus, Trash2, ChevronRight, CheckCircle, ArrowLeft, Loader2, Sun, Moon, Heart, ChevronUp, MessageCircle, Instagram, Phone, ChevronDown } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Skeleton } from './components/Skeleton';
import { onAuthStateChanged, signOut, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updatePassword, updateProfile } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';


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
  category: string;
};

type CartItem = Book & { quantity: number };

type Order = {
  id: string;
  date: string;
  totalPrice: number;
  items: CartItem[];
  createdAt?: Timestamp;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
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
    
    // DEBUG: Log the full error object
    console.log("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));

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
           message = `Authentication error (${error.code}). Please try again.`;
       }
    } 
    // Check if it's a network error
    else if (error instanceof TypeError && error.message === 'Failed to fetch') {
      message = 'A network error occurred. Please check your internet connection.';
    }
    // Check if it's a firestore error
    else if (error.code && typeof error.code === 'string' && error.code.startsWith('firestore/')) {
        message = 'A database error occurred. Please try again later.';
    }
    else if (error.message) {
      message = error.message;
    } else {
      message = 'An unexpected error occurred. Please try again.';
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

  useEffect(() => {
    if (user) {
      const loadOrders = async () => {
        setIsLoadingOrders(true);
        try {
          const ordersRef = collection(db, 'users', user.uid, 'orders');
          const q = query(ordersRef, orderBy('createdAt', 'desc'));
          const snapshot = await getDocs(q);
          const ordersList: Order[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Omit<Order, 'id'>)
          }));
          setOrders(ordersList);
        } catch (e) {
          handleError(e, 'Loading orders');
        } finally {
          setIsLoadingOrders(false);
        }
      };
      loadOrders();
    } else {
      setOrders([]);
    }
  }, [user]);

  const [booksState, setBooks] = useState<Book[]>([
    { id: 1, title: 'Atomic Habits', author: 'James Clear', price: 8000, synopsis: "A practical guide to building good habits and breaking bad ones. Clear introduces the concept of 'atomic habits' — tiny 1% improvements that compound over time into remarkable results. Using a four-step framework (cue, craving, response, reward), he shows that the problem is never the person but the system. You don't rise to your goals; you fall to your systems.", authorBio: 'James Clear is an author and speaker focused on habits, decision-making, and continuous improvement.', reviews: [{ user: 'Jack', comment: 'Profound and practical.', rating: 5 }], coverImageUrl: 'https://i.imgur.com/N4VV8u1.jpeg', publicationDate: '2018-10-16', pageCount: 320, category: 'PERSONAL DEVELOPMENT' },
    { id: 2, title: 'Ikigai', author: 'Héctor García & Francesc Miralles', price: 6500, synopsis: "An exploration of the Japanese concept of ikigai — your reason for being, where what you love, what you're good at, what the world needs, and what you can be paid for overlap. Drawing on interviews with the world's longest-living people in Okinawa, Japan, the book reveals the secrets to a long, purposeful, and joyful life.", authorBio: 'Héctor García & Francesc Miralles are authors who explore Japanese philosophy.', reviews: [{ user: 'Kelly', comment: 'An insightful read.', rating: 4 }], coverImageUrl: 'https://i.imgur.com/0r9aCtb.jpeg', publicationDate: '2017-09-07', pageCount: 208, category: 'PERSONAL DEVELOPMENT' },
    { id: 3, title: 'The Courage to Be Disliked', author: 'Ichiro Kishimi & Fumitake Koga', price: 8500, synopsis: "A dialogue between a philosopher and a young man that introduces the ideas of Alfred Adler, the largely overlooked founder of individual psychology. Adler argues that all problems are interpersonal relationship problems, that trauma does not exist as we commonly understand it, and that happiness is the courage to accept being disliked by others.", authorBio: 'Ichiro Kishimi & Fumitake Koga are authors who explore Adlerian psychology.', reviews: [{ user: 'Liam', comment: 'Very thought-provoking.', rating: 5 }], coverImageUrl: 'https://i.imgur.com/mLsgJhC.jpeg', publicationDate: '2018-05-08', pageCount: 288, category: 'PERSONAL DEVELOPMENT' },
    { id: 4, title: 'The Subtle Art of Not Giving a F*ck', author: 'Mark Manson', price: 6500, synopsis: "A counterintuitive approach to living a good life. Manson argues that the key to a better life is not caring about more things, but caring about fewer things — choosing what truly matters and letting go of everything else. The book is about values, not indifference: picking the right things to care about and then caring about them deeply.", authorBio: 'Mark Manson is a blogger and author focusing on personal growth and relationships.', reviews: [{ user: 'Alice', comment: 'Very direct and helpful.', rating: 5 }], coverImageUrl: 'https://i.imgur.com/dDs8OAn.jpeg', publicationDate: '2016-09-13', pageCount: 224, category: 'PERSONAL DEVELOPMENT' },
    { id: 5, title: 'The Psychology of Money', author: 'Morgan Housel', price: 7000, synopsis: "Nineteen short stories exploring the strange ways people think about money. Housel argues that doing well with money has little to do with intelligence and everything to do with behaviour.", authorBio: 'Morgan Housel is a partner at Collaborative Fund and a former columnist at The Motley Fool and The Wall Street Journal.', reviews: [], coverImageUrl: 'https://i.imgur.com/65nL1js.jpeg', publicationDate: '2020-09-07', pageCount: 242, category: 'PERSONAL DEVELOPMENT' },
    { id: 6, title: 'Think for Yourself', author: 'Thibaut Meurisse', price: 6500, synopsis: "A practical guide to overcoming cognitive biases, avoiding deception, and developing genuine critical thinking. Meurisse argues that most people do not think — they absorb beliefs from their environment and defend them as their own. The book provides tools to question assumptions, identify propaganda, and form more accurate views of the world.", authorBio: 'Thibaut Meurisse is an author focusing on productivity and personal development.', reviews: [], coverImageUrl: 'https://i.imgur.com/fjqOUDq.jpeg', publicationDate: '2020', pageCount: 154, category: 'PERSONAL DEVELOPMENT' },
    { id: 7, title: 'The Power of Now', author: 'Eckhart Tolle', price: 7500, synopsis: "A guide to spiritual enlightenment through the practice of present-moment awareness. Tolle argues that the source of most human suffering is identification with the thinking mind and its obsession with past and future. By learning to observe thoughts rather than identify with them, one discovers a state of peace and presence beneath all thought.", authorBio: 'Eckhart Tolle is a spiritual teacher and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/zkDK8eb.jpeg', publicationDate: '1997', pageCount: 236, category: 'PERSONAL DEVELOPMENT' },
    { id: 8, title: '12 Rules for Life', author: 'Jordan B. Peterson', price: 11000, synopsis: "An antidote to chaos. Peterson draws on mythology, religion, neuroscience, and his clinical practice to offer twelve practical rules for living: from 'stand up straight with your shoulders back' to 'tell the truth — or, at least, don't lie.' A challenging exploration of responsibility, meaning, and the necessity of suffering.", authorBio: 'Jordan B. Peterson is a clinical psychologist and professor.', reviews: [], coverImageUrl: 'https://i.imgur.com/7IKquav.jpeg', publicationDate: '2018-01-23', pageCount: 409, category: 'PERSONAL DEVELOPMENT' },
    { id: 9, title: 'Can\'t Hurt Me', author: 'David Goggins', price: 9500, synopsis: "The extraordinary memoir of David Goggins — the only man to complete Navy SEAL training, Army Ranger School, and Air Force Tactical Air Controller training. Growing up in abject poverty with an abusive father, Goggins overcame obesity, racism, and self-doubt to become one of the world's greatest endurance athletes and the 'hardest man alive.'", authorBio: 'David Goggins is an American retired United States Navy SEAL and former United States Air Force Tactical Air Control Party member.', reviews: [], coverImageUrl: 'https://i.imgur.com/92seEti.jpeg', publicationDate: '2018-12-04', pageCount: 364, category: 'PERSONAL DEVELOPMENT' },
    { id: 10, title: 'Set Boundaries, Find Peace', author: 'Nedra Glennon Tawwab', price: 6500, synopsis: "A practical guide to setting healthy boundaries in every area of life — work, family, romantic relationships, and friendships. Tawwab, a therapist, argues that most anxiety, resentment, burnout, and unhappiness stem from a lack of clear boundaries, and shows readers how to identify, communicate, and maintain them.", authorBio: 'Nedra Glennon Tawwab is a licensed therapist and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/U6VGTuU.jpeg', publicationDate: '2021-03-16', pageCount: 272, category: 'PERSONAL DEVELOPMENT' },
    { id: 11, title: 'Eat That Frog!', author: 'Brian Tracy', price: 6500, synopsis: "Based on the Mark Twain quote that if you eat a live frog first thing in the morning, nothing worse will happen to you all day, Tracy presents 21 techniques to stop procrastinating and get more done in less time. The 'frog' is your most important, most challenging task — the one you're most likely to avoid.", authorBio: 'Brian Tracy is a self-development author and motivational speaker.', reviews: [], coverImageUrl: 'https://i.imgur.com/odih83L.jpeg', publicationDate: '2001-01-01', pageCount: 128, category: 'PERSONAL DEVELOPMENT' },
    { id: 12, title: 'Think and Grow Rich', author: 'Napoleon Hill', price: 7500, synopsis: "One of the best-selling self-help books of all time. Based on Hill's study of over 500 successful people including Andrew Carnegie, Henry Ford, and Thomas Edison, the book outlines 13 principles for accumulating wealth — from desire and faith to specialised knowledge, imagination, and the mastermind alliance.", authorBio: 'Napoleon Hill was an American self-help author.', reviews: [], coverImageUrl: 'https://i.imgur.com/ulvXa0c.jpeg', publicationDate: '1937', pageCount: 233, category: 'PERSONAL DEVELOPMENT' },
    { id: 13, title: 'Hidden Potential', author: 'Adam Grant', price: 5000, synopsis: "A challenge to the notion that talent is fixed. Grant argues that the greatest untapped source of human potential is not prodigies who start with natural ability but ordinary people who put in the work to develop extraordinary skills. A science-backed exploration of how to grow beyond your starting point.", authorBio: 'Adam Grant is an organizational psychologist and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/Mw0qcZ9.jpeg', publicationDate: '2023-10-03', pageCount: 288, category: 'PERSONAL DEVELOPMENT' },
    { id: 14, title: 'The School of Life', author: 'Alain de Botton & The School of Life', price: 7500, synopsis: "An emotional education — exploring what it means to be a good person, to have a good relationship, a fulfilling career, and a properly examined inner life. Drawing on philosophy, psychology, and literature, the book addresses the questions that matter most but are rarely discussed seriously.", authorBio: 'Alain de Botton is a British-Swiss philosopher and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/i4Cbd5w.jpeg', publicationDate: '2019', pageCount: 456, category: 'PERSONAL DEVELOPMENT' },
    { id: 15, title: 'The Power of Your Subconscious Mind', author: 'Joseph Murphy', price: 8500, synopsis: "A classic self-help text arguing that the subconscious mind is a powerful force that can be harnessed through positive thinking, visualisation, and affirmation. Murphy draws on religious and psychological principles to show how directing the subconscious can improve health, relationships, wealth, and happiness.", authorBio: 'Joseph Murphy was a Divine Science minister and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/8OlmcHO.jpeg', publicationDate: '1963', pageCount: 320, category: 'PERSONAL DEVELOPMENT' },
    { id: 16, title: 'Think Again', author: 'Adam Grant', price: 8000, synopsis: "A manifesto for the value of rethinking and unlearning. Grant argues that intelligence is not just about knowing — it's about knowing what you don't know, questioning your assumptions, and being willing to change your mind. In a world of increasing certainty, the ability to think again is the most undervalued skill.", authorBio: 'Adam Grant is an organizational psychologist and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/svyEX3c.jpeg', publicationDate: '2021-02-02', pageCount: 307, category: 'PERSONAL DEVELOPMENT' },
    { id: 17, title: 'The 7 Habits of Highly Effective People', author: 'Stephen R. Covey', price: 7500, synopsis: "One of the most influential business books ever written. Covey presents seven habits that align character and competence: be proactive; begin with the end in mind; put first things first; think win-win; seek first to understand; synergise; and sharpen the saw. A principle-centred approach to personal and professional effectiveness.", authorBio: 'Stephen R. Covey was an American educator, author, and businessman.', reviews: [], coverImageUrl: 'https://i.imgur.com/JwTajMO.jpeg', publicationDate: '1989-08-15', pageCount: 381, category: 'PERSONAL DEVELOPMENT' },
    { id: 18, title: 'Master Your Emotions', author: 'Thibaut Meurisse', price: 7500, synopsis: "A practical guide to taking control of your emotions rather than being controlled by them. Meurisse explains how emotions are created, why they become destructive, and the specific techniques — from reframing to acceptance — that build emotional resilience and inner stability.", authorBio: 'Thibaut Meurisse is an author focusing on productivity and personal development.', reviews: [], coverImageUrl: 'https://i.imgur.com/nAjYaHK.jpeg', publicationDate: '2019', pageCount: 166, category: 'PERSONAL DEVELOPMENT' },
    { id: 19, title: 'Stillness Is the Key', author: 'Ryan Holiday', price: 7000, synopsis: "Drawing on Stoic, Buddhist, and other philosophical traditions, Holiday argues that inner stillness — the ability to slow down, be present, and find calm amidst chaos — is the secret weapon of the greatest leaders, athletes, artists, and thinkers in history. The third book in his Stoic philosophy series.", authorBio: 'Ryan Holiday is an American author and media strategist.', reviews: [], coverImageUrl: 'https://i.imgur.com/GcpzxVd.jpeg', publicationDate: '2019-10-01', pageCount: 288, category: 'PERSONAL DEVELOPMENT' },
    { id: 20, title: 'The Let Them Theory', author: 'Mel Robbins', price: 8500, synopsis: "A simple but transformative mindset shift: let people do what they want, say what they want, think what they want — and stop trying to control them. Robbins argues that the two most liberating words in personal development are 'let them,' and that accepting others' choices is the key to your own freedom and peace.", authorBio: 'Mel Robbins is an American television host, author, and motivational speaker.', reviews: [], coverImageUrl: 'https://i.imgur.com/oDugCZZ.jpeg', publicationDate: '2025-02-18', pageCount: 320, category: 'PERSONAL DEVELOPMENT' },
    { id: 21, title: 'Don\'t Believe Everything You Think', author: 'Joseph Nguyen', price: 6000, synopsis: "An exploration of why the root of all psychological suffering is thinking — specifically, our habit of believing every thought that passes through our mind. Nguyen argues that freedom comes not from positive thinking but from no longer identifying with thought itself, drawing on principles of non-duality and mindfulness.", authorBio: 'Joseph Nguyen is an author focused on mental and emotional well-being.', reviews: [], coverImageUrl: 'https://i.imgur.com/tg6S7FC.jpeg', publicationDate: '2022-12-20', pageCount: 168, category: 'PERSONAL DEVELOPMENT' },
    { id: 23, title: 'Never Finished', author: 'David Goggins', price: 7000, synopsis: "The follow-up to Can't Hurt Me. Goggins goes deeper into the mental tools that helped him survive and thrive: the 40% rule, the cookie jar method, and the ability to evolve far beyond what most people think is possible. A sequel that is rawer and more philosophically demanding than its predecessor.", authorBio: 'David Goggins is an American retired United States Navy SEAL and former United States Air Force Tactical Air Control Party member.', reviews: [], coverImageUrl: 'https://i.imgur.com/ipShLC7.jpeg', publicationDate: '2022-12-06', pageCount: 336, category: 'PERSONAL DEVELOPMENT' },
    { id: 24, title: 'Tuesdays with Morrie', author: 'Mitch Albom', price: 6500, synopsis: "The true story of sportswriter Mitch Albom, who reconnects with his beloved college professor Morrie Schwartz as Morrie is dying from ALS. Every Tuesday, they discuss life's greatest questions — love, work, community, family, aging, forgiveness, and death. A small book that contains enormous wisdom.", authorBio: 'Mitch Albom is an American author, journalist, and broadcaster.', reviews: [], coverImageUrl: 'https://i.imgur.com/XCGf90f.jpeg', publicationDate: '1997-08-18', pageCount: 192, category: 'PERSONAL DEVELOPMENT' },
    { id: 25, title: 'The Obstacle Is the Way', author: 'Ryan Holiday', price: 7500, synopsis: "Drawing on the Stoic philosophy of Marcus Aurelius, Holiday argues that obstacles are not problems to be solved but opportunities to be embraced. Through historical examples from Marcus Aurelius to Amelia Earhart to Steve Jobs, he demonstrates that the impediment to action advances action — what stands in the way becomes the way.", authorBio: 'Ryan Holiday is an American author and media strategist.', reviews: [], coverImageUrl: 'https://i.imgur.com/YJ7toFO.jpeg', publicationDate: '2014-05-01', pageCount: 224, category: 'PERSONAL DEVELOPMENT' },
    { id: 26, title: 'The 5AM Club', author: 'Robin Sharma', price: 8500, synopsis: "A story about two strangers who meet a quirky billionaire who teaches them the 20/20/20 formula: spend the first 20 minutes of the morning exercising, the next 20 reflecting and planning, and the last 20 learning. Sharma argues that owning your morning is the foundation of an extraordinary life.", authorBio: 'Robin Sharma is a Canadian writer and leadership speaker.', reviews: [], coverImageUrl: 'https://i.imgur.com/NfAJ4em.jpeg', publicationDate: '2018-12-04', pageCount: 352, category: 'PERSONAL DEVELOPMENT' },
    { id: 27, title: 'Clear Thinking', author: 'Shane Parrish', price: 8500, synopsis: "A framework for making better decisions in the moments that matter most. Parrish argues that most bad outcomes result not from insufficient information but from failing to think clearly in high-stakes situations. He presents four key defaults that undermine clear thinking and the principles that overcome them.", authorBio: 'Shane Parrish is the founder of Farnam Street.', reviews: [], coverImageUrl: 'https://i.imgur.com/zJj8o9r.jpeg', publicationDate: '2023-10-03', pageCount: 272, category: 'PERSONAL DEVELOPMENT' },
    { id: 28, title: 'Unfu*k Yourself', author: 'Gary John Bishop', price: 7500, synopsis: "A no-nonsense guide to getting out of your own way. Bishop argues that the source of most failure is the stories people tell themselves — and that by changing the assertions you make about yourself, you change your reality. Written in the voice of a Scottish life coach who doesn't tolerate self-pity.", authorBio: 'Gary John Bishop is an author and personal development expert.', reviews: [], coverImageUrl: 'https://i.imgur.com/BXjBuBe.jpeg', publicationDate: '2017-01-31', pageCount: 176, category: 'PERSONAL DEVELOPMENT' },
    { id: 29, title: 'Hyperfocus', author: 'Chris Bailey', price: 7500, synopsis: "A counterintuitive guide to productivity that argues we need two modes of thinking: hyperfocus (deep, intentional concentration on one task) and scatterfocus (deliberately letting the mind wander to enable creativity and problem-solving). Bailey shows how to toggle between these modes to become exponentially more effective.", authorBio: 'Chris Bailey is a productivity expert and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/IvxIx6w.jpeg', publicationDate: '2018-09-04', pageCount: 256, category: 'PERSONAL DEVELOPMENT' },
    { id: 30, title: 'Dopamine Detox', author: 'Thibaut Meurisse', price: 6500, synopsis: "A guide to reclaiming control of your attention in an age of addictive technology. Meurisse explains how constant stimulation from social media, entertainment, and notifications depletes motivation and focus, and provides a practical protocol for resetting your dopamine system to restore drive and clarity.", authorBio: 'Thibaut Meurisse is an author focusing on productivity and personal development.', reviews: [], coverImageUrl: 'https://i.imgur.com/uiUhNhP.jpeg', publicationDate: '2020', pageCount: 132, category: 'PERSONAL DEVELOPMENT' },
    { id: 31, title: 'Who Moved My Cheese?', author: 'Spencer Johnson', price: 5500, synopsis: "A parable about two mice and two tiny humans who live in a maze and depend on cheese for their happiness. When the cheese moves, their responses reveal everything about how people deal with change. A deceptively simple story with a profound message about adaptability and letting go.", authorBio: 'Spencer Johnson was an American physician and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/YWDFZOp.jpeg', publicationDate: '1998-09-08', pageCount: 96, category: 'PERSONAL DEVELOPMENT' },
    { id: 32, title: 'How to Get from Where You Are to Where You Want to Be', author: 'Jack Canfield', price: 8500, synopsis: "Known as The Success Principles, this book presents 64 timeless principles used by successful men and women throughout history. Canfield distils decades of research and experience into practical strategies for taking 100% responsibility for your life and achieving any goal you set.", authorBio: 'Jack Canfield is an American author and motivational speaker.', reviews: [], coverImageUrl: 'https://i.imgur.com/wkoWbKH.jpeg', publicationDate: '2005', pageCount: 512, category: 'PERSONAL DEVELOPMENT' },
    { id: 33, title: 'Single on Purpose', author: 'John Kim', price: 6500, synopsis: "A guide to using the single life as an opportunity for radical self-discovery and growth rather than a period of waiting for love. Kim challenges readers to build a rich relationship with themselves — to find purpose, heal old wounds, and develop a strong sense of self — before seeking it from a partner.", authorBio: 'John Kim is a licensed therapist and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/ThAhtXW.jpeg', publicationDate: '2021-03-16', pageCount: 256, category: 'PERSONAL DEVELOPMENT' },
    { id: 34, title: 'The Power of Self-Discipline', author: 'Brian Tracy', price: 7000, synopsis: "A guide to building the self-discipline that separates the extraordinary from the ordinary. Walter examines the psychology of discipline, explains why willpower fails, and presents practical strategies for building daily habits that compound into lasting achievement.", authorBio: 'Brian Tracy is a self-development author and motivational speaker.', reviews: [], coverImageUrl: 'https://i.imgur.com/vxkqMOA.jpeg', publicationDate: '2020', pageCount: 188, category: 'PERSONAL DEVELOPMENT' },
    { id: 35, title: 'Good Vibes, Good Life', author: 'Vex King', price: 6500, synopsis: "A guide to raising your vibration and transforming your life through self-love. King shares his own story of growing up in poverty and overcoming adversity, and presents principles of mindfulness, gratitude, and positive thinking that he credits with his personal transformation.", authorBio: 'Vex King is a social media influencer and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/MJSUhc6.jpeg', publicationDate: '2019-04-02', pageCount: 272, category: 'PERSONAL DEVELOPMENT' },
    { id: 36, title: 'The Wealth Money Can\'t Buy', author: 'Robin Sharma', price: 7500, synopsis: "Sharma's exploration of the eight forms of wealth beyond money — growth, wellness, family, craft, community, adventure, service, and soulfulness. He argues that true richness means thriving in all eight areas, and provides a framework for building a life of genuine abundance.", authorBio: 'Robin Sharma is a Canadian writer and leadership speaker.', reviews: [], coverImageUrl: 'https://i.imgur.com/M4MnoF8.jpeg', publicationDate: '2024-01-30', pageCount: 288, category: 'PERSONAL DEVELOPMENT' },
    { id: 37, title: 'As a Man Thinketh', author: 'James Allen', price: 6500, synopsis: "A slim but profound essay on the power of thought. Allen argues that a person is literally what they think — that character, circumstance, health, and achievement are all direct products of habitual thinking. One of the earliest and most influential self-help texts ever written.", authorBio: 'James Allen was a British writer.', reviews: [], coverImageUrl: 'https://i.imgur.com/u5jt1PP.jpeg', publicationDate: '1903', pageCount: 52, category: 'PERSONAL DEVELOPMENT' },
    { id: 38, title: 'The Almanack of Naval Ravikant', author: 'Eric Jorgenson', price: 8500, synopsis: "A curated collection of Naval Ravikant's wisdom on wealth and happiness, assembled from his tweets, podcasts, and essays. Covers how to think about wealth creation, leverage, specific knowledge, and the foundations of a happy life — all distilled from one of Silicon Valley's most respected thinkers.", authorBio: 'Eric Jorgenson is an author and entrepreneur.', reviews: [], coverImageUrl: 'https://i.imgur.com/lLlaffU.jpeg', publicationDate: '2020', pageCount: 242, category: 'PERSONAL DEVELOPMENT' },
    { id: 39, title: 'The Daily Stoic', author: 'Ryan Holiday & Stephen Hanselman', price: 10000, synopsis: "A structured daily guide to Stoic philosophy, offering 366 short readings — one for each day of the year. Each entry presents timeless teachings from Stoic philosophers like Marcus Aurelius, Seneca, and Epictetus, paired with modern reflections to help readers build resilience, discipline, and emotional control.", authorBio: 'Ryan Holiday is an American author and media strategist.', reviews: [], coverImageUrl: 'https://i.imgur.com/h5LsiFs.jpeg', publicationDate: '2016', pageCount: 416, category: 'PERSONAL DEVELOPMENT' },
    { id: 40, title: 'Ego is the Enemy', author: 'Ryan Holiday', price: 6500, synopsis: "This book explores how ego — our inflated sense of self-importance — becomes a major obstacle to success, learning, and fulfillment. Using historical figures, athletes, and leaders, it shows how ego can sabotage ambition and how humility and discipline create lasting achievement.", authorBio: 'Ryan Holiday is an American author and media strategist.', reviews: [], coverImageUrl: 'https://i.imgur.com/qDDg9Du.jpeg', publicationDate: '2016', pageCount: 226, category: 'PERSONAL DEVELOPMENT' },
    { id: 41, title: 'The Art of Laziness', author: 'Library Mindset', price: 5500, synopsis: "A modern productivity guide that challenges traditional ideas of hustle culture. It focuses on overcoming procrastination, building efficient habits, and achieving goals with less stress by working smarter rather than harder.", authorBio: 'Library Mindset is a creator focusing on productivity.', reviews: [], coverImageUrl: 'https://i.imgur.com/Q0qZN5H.jpeg', publicationDate: '2021', pageCount: 170, category: 'PERSONAL DEVELOPMENT' },
    { id: 42, title: 'Don\'t Leave Anything for Later', author: 'Library Mindset', price: 5500, synopsis: "A motivational productivity-focused book aimed at helping readers eliminate procrastination and take immediate action toward their goals. It emphasizes discipline, urgency, and breaking the habit of delaying important tasks.", authorBio: 'Library Mindset is a creator focusing on productivity.', reviews: [], coverImageUrl: 'https://i.imgur.com/oEVfB1A.jpeg', publicationDate: '2025', pageCount: 150, category: 'PERSONAL DEVELOPMENT' },
    { id: 43, title: 'You\'re a Badass', author: 'Jen Sincero', price: 6500, synopsis: "A motivational self-help book that encourages readers to stop self-doubt, reframe limiting beliefs, and take control of their lives. It blends humor, personal stories, and practical advice to help readers build confidence and pursue their goals boldly.", authorBio: 'Jen Sincero is an American author and motivational speaker.', reviews: [], coverImageUrl: 'https://i.imgur.com/VEjVvNN.jpeg', publicationDate: '2013', pageCount: 256, category: 'PERSONAL DEVELOPMENT' },
    { id: 44, title: 'How to Finish Everything You Start', author: 'Jan Yager', price: 7000, synopsis: "A productivity guide that explains why people struggle to complete tasks and offers practical methods to improve focus, avoid procrastination, and finish what they begin. It introduces a structured approach to help readers prioritize better and follow through consistently.", authorBio: 'Jan Yager is an American author, speaker, and sociologist.', reviews: [], coverImageUrl: 'https://i.imgur.com/VaV0Oup.jpeg', publicationDate: '2019', pageCount: 240, category: 'PERSONAL DEVELOPMENT' },
    { id: 45, title: 'The Psychology of Money', author: 'Morgan Housel', price: 7000, synopsis: "Nineteen short stories exploring the strange ways people think about money. Housel argues that doing well with money has little to do with intelligence and everything to do with behaviour. Financial success depends on your relationship with greed, fear, and time — not spreadsheets.", authorBio: 'Morgan Housel is a partner at Collaborative Fund and a former columnist at The Motley Fool and The Wall Street Journal.', reviews: [], coverImageUrl: 'https://i.imgur.com/65nL1js.jpeg', publicationDate: '2020-09-07', pageCount: 242, category: 'FINANCE' },
    { id: 46, title: 'The Richest Man in Babylon', author: 'George S. Clason', price: 6500, synopsis: "A collection of parables set in ancient Babylon that reveal timeless financial wisdom. Through stories of merchants, tradesmen, and money lenders, Clason explains the principles of wealth building: pay yourself first, live below your means, invest wisely, protect your wealth, and own your home.", authorBio: 'George S. Clason was an American author.', reviews: [], coverImageUrl: 'https://i.imgur.com/BcAKsUb.jpeg', publicationDate: '1926', pageCount: 144, category: 'FINANCE' },
    { id: 47, title: 'Think Like an Entrepreneur', author: 'Various / Multiple editions', price: 7000, synopsis: "A guide to developing the mindset, habits, and strategic thinking that separate successful entrepreneurs from those who never get off the ground. Covers risk tolerance, opportunity recognition, resilience, and building businesses that create real value.", authorBio: 'N/A', reviews: [], coverImageUrl: 'https://i.imgur.com/71Xa7xH.jpeg', publicationDate: 'Varies by edition', pageCount: 0, category: 'FINANCE' },
    { id: 48, title: '100M Money Deals', author: 'Alex Hormozi', price: 6500, synopsis: "How to make offers so good people feel stupid saying no. Hormozi breaks down the science of crafting grand slam offers that command premium prices, eliminate price resistance, and drive explosive business growth. Considered one of the most practical business books of the past decade.", authorBio: 'Alex Hormozi is an entrepreneur and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/oJ6jQkL.jpeg', publicationDate: '2021-09-08', pageCount: 239, category: 'FINANCE' },
    { id: 49, title: 'The Art of Spending Money', author: 'Morgan Housel', price: 7500, synopsis: "The follow-up to The Psychology of Money, this book explores the surprisingly difficult question of how to spend money well — on things that genuinely increase happiness rather than things that merely signal status. Housel argues that the biggest financial problem most people have is not making or saving money but knowing what to do with it.", authorBio: 'Morgan Housel is a former columnist at The Motley Fool and The Wall Street Journal.', reviews: [], coverImageUrl: 'https://i.imgur.com/IyAhBxg.jpeg', publicationDate: '2024', pageCount: 256, category: 'FINANCE' },
    { id: 50, title: 'Rich Dad Poor Dad', author: 'Robert T. Kiyosaki', price: 6000, synopsis: "Kiyosaki's account of the financial lessons he learned from his own highly educated but financially struggling father (Poor Dad) and his best friend's father, a self-made businessman (Rich Dad). The book challenges the conventional wisdom about money — arguing that assets generate income, liabilities drain it, and the rich make their money work for them.", authorBio: 'Robert T. Kiyosaki is an American businessman and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/OMSfMRm.jpeg', publicationDate: '1997-04-01', pageCount: 207, category: 'FINANCE' },
    { id: 51, title: 'Think and Grow Rich', author: 'Napoleon Hill', price: 7500, synopsis: "One of the best-selling self-help books of all time. Based on Hill's study of over 500 successful people including Andrew Carnegie, Henry Ford, and Thomas Edison, the book outlines 13 principles for accumulating wealth — from desire and faith to specialised knowledge, imagination, and the mastermind alliance.", authorBio: 'Napoleon Hill was an American self-help author.', reviews: [], coverImageUrl: 'https://i.imgur.com/ulvXa0c.jpeg', publicationDate: '1937', pageCount: 233, category: 'FINANCE' },
    { id: 52, title: 'The Rules of Wealth', author: 'Richard Templar', price: 7500, synopsis: "One hundred and seven simple, practical rules for accumulating and keeping wealth. Templar covers earning more, spending less, investing wisely, cultivating the right attitudes, and the often-overlooked habits of genuinely wealthy people. Clear, no-nonsense, and grounded in common sense rather than get-rich-quick promises.", authorBio: 'Richard Templar is an author of self-help books.', reviews: [], coverImageUrl: 'https://i.imgur.com/Soi26kl.jpeg', publicationDate: '2006', pageCount: 240, category: 'FINANCE' },
    { id: 53, title: 'The 80/20 Principle', author: 'Richard Koch', price: 6500, synopsis: "Based on the Pareto Principle — 80% of results come from 20% of causes — Koch shows how this insight can be applied to every aspect of business and life. By identifying the 20% of activities that produce 80% of value, you can work less, earn more, and achieve more.", authorBio: 'Richard Koch is a British author and consultant.', reviews: [], coverImageUrl: 'https://i.imgur.com/xs7Z5mv.jpeg', publicationDate: '1997', pageCount: 288, category: 'FINANCE' },
    { id: 54, title: 'Money: Master the Game', author: 'Tony Robbins', price: 7500, synopsis: "A comprehensive guide to financial freedom, based on interviews with 50 of the world's greatest financial minds including Warren Buffett, Ray Dalio, and Jack Bogle. Robbins distils their wisdom into a seven-step blueprint that anyone can follow to achieve financial independence.", authorBio: 'Tony Robbins is an American motivational speaker and philanthropist.', reviews: [], coverImageUrl: 'https://i.imgur.com/UEFbUUg.jpeg', publicationDate: '2014-11-18', pageCount: 688, category: 'FINANCE' },
    { id: 55, title: 'Profit First', author: 'Mike Michalowicz', price: 8000, synopsis: "A counterintuitive cash management system for businesses: instead of calculating profit after expenses, take profit first. Michalowicz argues that by allocating profit before paying anything else, business owners permanently change their relationship with money and transform their business from financially stressed to fundamentally profitable.", authorBio: 'Mike Michalowicz is an American author and entrepreneur.', reviews: [], coverImageUrl: 'https://i.imgur.com/kYbb5vf.jpeg', publicationDate: '2017', pageCount: 224, category: 'FINANCE' },
    { id: 56, title: 'The Almanack of Naval Ravikant', author: 'Eric Jorgenson', price: 8500, synopsis: "A curated collection of Naval Ravikant's wisdom on wealth and happiness, assembled from his tweets, podcasts, and essays. Covers how to think about wealth creation, leverage, specific knowledge, and the foundations of a happy life — all distilled from one of Silicon Valley's most respected thinkers.", authorBio: 'Eric Jorgenson is an author and entrepreneur.', reviews: [], coverImageUrl: 'https://i.imgur.com/lLlaffU.jpeg', publicationDate: '2020', pageCount: 242, category: 'FINANCE' },
    { id: 57, title: 'The Mafia Manager', author: 'V.', price: 5500, synopsis: "A management manual disguised as a study of how the Mafia operates. Using the structure and methods of organised crime as a metaphor, the anonymous author (V.) provides ruthlessly practical guidance on leadership, loyalty, handling competition, managing people, and building organisations that endure. Compared widely to Machiavelli's The Prince.", authorBio: 'Anonymous (V.)', reviews: [], coverImageUrl: 'https://i.imgur.com/8T5YFQg.jpeg', publicationDate: '1996', pageCount: 192, category: 'BUSINESS' },
    { id: 58, title: 'Think Like an Entrepreneur', author: 'Various / Multiple editions', price: 7000, synopsis: "A guide to developing the mindset, habits, and strategic thinking that separate successful entrepreneurs from those who never get off the ground. Covers risk tolerance, opportunity recognition, resilience, and building businesses that create real value.", authorBio: 'N/A', reviews: [], coverImageUrl: 'https://i.imgur.com/71Xa7xH.jpeg', publicationDate: 'Varies by edition', pageCount: 0, category: 'BUSINESS' },
    { id: 59, title: 'The Personal MBA', author: 'Josh Kaufman', price: 10500, synopsis: "A comprehensive overview of what business schools teach — without the tuition fees. Kaufman covers the fundamentals of value creation, marketing, sales, finance, and human behaviour, arguing that a rigorous self-education can outperform an MBA for most career purposes.", authorBio: 'Josh Kaufman is a business educator and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/24qv1sj.jpeg', publicationDate: '2010-12-30', pageCount: 464, category: 'BUSINESS' },
    { id: 60, title: 'Making It Big', author: 'Femi Otedola', price: 13500, synopsis: "A guide to scaling businesses and achieving significant entrepreneurial success. Covers growth strategies, funding, team building, and the mindset required to take a business from startup to substantial enterprise.", authorBio: 'Femi Otedola', reviews: [], coverImageUrl: 'https://i.imgur.com/gFZeze6.jpeg', publicationDate: 'Varies', pageCount: 0, category: 'BUSINESS' },
    { id: 61, title: 'The $100 Startup', author: 'Chris Guillebeau', price: 8000, synopsis: "How to start a business with minimal capital. Guillebeau studied 1,500 people who built businesses earning at least $50,000 annually — with starting costs of $100 or less. He presents the patterns, principles, and strategies that enabled them to achieve freedom and profit without corporate careers.", authorBio: 'Chris Guillebeau is an author and speaker.', reviews: [], coverImageUrl: 'https://i.imgur.com/XEHdgT3.jpeg', publicationDate: '2012-05-08', pageCount: 304, category: 'BUSINESS' },
    { id: 62, title: 'Profit First', author: 'Mike Michalowicz', price: 8000, synopsis: "A counterintuitive cash management system for businesses: instead of calculating profit after expenses, take profit first. Michalowicz argues that by allocating profit before paying anything else, business owners permanently change their relationship with money and transform their business from financially stressed to fundamentally profitable.", authorBio: 'Mike Michalowicz is an American author and entrepreneur.', reviews: [], coverImageUrl: 'https://i.imgur.com/kYbb5vf.jpeg', publicationDate: '2017', pageCount: 224, category: 'BUSINESS' },
    { id: 63, title: 'Good Strategy / Bad Strategy', author: 'Richard Rumelt', price: 8500, synopsis: "A rigorous examination of what real strategy is — and what it isn't. Rumelt argues that most so-called strategies are actually goals, visions, or wishes dressed up in strategic language. Good strategy has a kernel: a diagnosis, a guiding policy, and coherent actions. Bad strategy is vague, wishful thinking with no real edge.", authorBio: 'Richard Rumelt is a professor and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/w9470C1.jpeg', publicationDate: '2011-07-19', pageCount: 336, category: 'BUSINESS' },
    { id: 64, title: 'Deep Work', author: 'Cal Newport', price: 10000, synopsis: "The ability to focus without distraction on cognitively demanding tasks is becoming increasingly rare — and increasingly valuable. Newport argues that deep work is the superpower of the 21st century economy and provides practical rules for transforming your work habits to produce more in less time.", authorBio: 'Cal Newport is a computer science professor and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/oWQzLLp.jpeg', publicationDate: '2016-01-05', pageCount: 296, category: 'BUSINESS' },
    { id: 65, title: 'Build a Business, Not a Job', author: 'David Finkel', price: 6500, synopsis: "A guide to creating a business that works without you — a genuine asset rather than a self-employment trap. Finkel shows business owners how to build systems, develop a team, and create leverage so the business generates freedom rather than consuming it.", authorBio: 'David Finkel is a business coach and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/BmS4SeB.jpeg', publicationDate: '2013', pageCount: 232, category: 'BUSINESS' },
    { id: 66, title: 'The Everyday Entrepreneur', author: 'Rob Yeung', price: 6000, synopsis: "A practical guide to thinking and behaving like an entrepreneur regardless of your job title or industry. Yeung draws on interviews with successful entrepreneurs to identify the mindsets, habits, and behaviours that drive entrepreneurial success in everyday professional life.", authorBio: 'Rob Yeung is an organisational psychologist and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/hCnsxpy.jpeg', publicationDate: '2012', pageCount: 240, category: 'BUSINESS' },
    { id: 67, title: 'Think Like a Brand, Act Like a Startup', author: 'Various / Multiple editions', price: 6500, synopsis: "A guide to combining the strategic brand-building of large companies with the agility and innovation of startups. Explores how organisations and individuals can develop strong brand identity while moving with entrepreneurial speed and adaptability.", authorBio: 'N/A', reviews: [], coverImageUrl: 'https://i.imgur.com/5hJaHYR.jpeg', publicationDate: 'Varies', pageCount: 0, category: 'BUSINESS' },
    { id: 68, title: 'Trump: The Art of the Deal', author: 'Donald Trump & Tony Schwartz', price: 7500, synopsis: "Part memoir, part business philosophy, Trump recounts major deals from his career in real estate and entertainment, outlining the principles he claims have guided his success: think big, protect the downside, maximise your options, know your market, and use leverage.", authorBio: 'Donald Trump & Tony Schwartz', reviews: [], coverImageUrl: 'https://i.imgur.com/JNvmm20.jpeg', publicationDate: '1987-11-01', pageCount: 246, category: 'BUSINESS' },
    { id: 69, title: 'Rework', author: 'Jason Fried & David Heinemeier Hansson', price: 8500, synopsis: "A manifesto against conventional business wisdom. The founders of Basecamp argue that meetings are toxic, planning is guessing, workaholism is stupid, and that the best way to build a great company is to do less, not more. A quick read that challenges nearly every assumption about how businesses should operate.", authorBio: 'Jason Fried & David Heinemeier Hansson', reviews: [], coverImageUrl: 'https://i.imgur.com/Sck6RkK.jpeg', publicationDate: '2010-03-09', pageCount: 288, category: 'BUSINESS' },
    { id: 70, title: 'Shoe Dog', author: 'Phil Knight', price: 8500, synopsis: "The memoir of Phil Knight, the co-founder of Nike. From his $50 loan from his father in 1962 through years of near-bankruptcy, legal battles, and creative struggle, Knight tells the story of building one of the world's most recognisable brands with unusual candour and literary grace.", authorBio: 'Phil Knight is the co-founder of Nike.', reviews: [], coverImageUrl: 'https://i.imgur.com/0JXzXYH.jpeg', publicationDate: '2016-04-26', pageCount: 386, category: 'BUSINESS' },
    { id: 71, title: 'Think Faster, Talk Smarter', author: 'Matt Abrahams', price: 8000, synopsis: "A Stanford professor's guide to communicating confidently and effectively in spontaneous situations — from Q&A sessions and job interviews to toasts and difficult conversations. Abrahams presents six strategies for managing anxiety, structuring responses, and delivering ideas clearly when there is no time to prepare.", authorBio: 'Matt Abrahams is a lecturer at Stanford.', reviews: [], coverImageUrl: 'https://i.imgur.com/LvD5lJA.jpeg', publicationDate: '2023-09-12', pageCount: 272, category: 'BUSINESS' },
    { id: 72, title: 'The Communication Book', author: 'Mikael Krogerus & Roman Tschappeler', price: 10000, synopsis: "Tested 44 communication theories that help people exchange information compassionately and effectively, especially in their daily business life. The book provides a guide that transforms how we speak and listen, enabling deeper connection and the peaceful resolution of conflict.", authorBio: 'Mikael Krogerus & Roman Tschappeler', reviews: [], coverImageUrl: 'https://i.imgur.com/6dZhIlb.jpeg', publicationDate: '2020', pageCount: 208, category: 'BUSINESS' },
    { id: 73, title: 'Never Split the Difference', author: 'Chris Voss (with Tahl Raz)', price: 8500, synopsis: "A negotiation guide based on real FBI hostage negotiation tactics. It teaches psychological techniques for persuasion, emotional intelligence, and communication strategies that help achieve better outcomes in business and everyday life.", authorBio: 'Chris Voss is a consultant and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/hlGfh7s.jpeg', publicationDate: '2016', pageCount: 288, category: 'BUSINESS' },
    { id: 74, title: '100M Money Deals', author: 'Alex Hormozi', price: 6500, synopsis: "How to make offers so good people feel stupid saying no. Hormozi breaks down the science of crafting grand slam offers that command premium prices, eliminate price resistance, and drive explosive business growth. Considered one of the most practical business books of the past decade.", authorBio: 'Alex Hormozi is an entrepreneur and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/oJ6jQkL.jpeg', publicationDate: '2021-09-08', pageCount: 239, category: 'BUSINESS' },
    { id: 75, title: 'The One Minute Manager', author: 'Ken Blanchard & Spencer Johnson', price: 6500, synopsis: "A deceptively simple parable about a young man searching for an effective manager. He eventually finds one who uses three management secrets: one-minute goals, one-minute praisings, and one-minute reprimands. The book launched one of the most influential approaches to management in the 20th century.", authorBio: 'Ken Blanchard & Spencer Johnson', reviews: [], coverImageUrl: 'https://i.imgur.com/Ebdl67G.jpeg', publicationDate: '1982', pageCount: 112, category: 'BUSINESS' },
    { id: 76, title: 'The Diary of a CEO', author: 'Steven Bartlett', price: 10000, synopsis: "Part memoir, part business guide, Bartlett shares the unfiltered story of building Social Chain from nothing to a publicly listed company by age 27. He reveals the psychological principles, counterintuitive laws, and hard lessons that shaped his success — including failure, mental health struggles, and imposter syndrome.", authorBio: 'Steven Bartlett is a British entrepreneur.', reviews: [], coverImageUrl: 'https://i.imgur.com/akXPM4F.jpeg', publicationDate: '2023-09-07', pageCount: 352, category: 'BUSINESS' },
    { id: 77, title: 'The 7 Habits of Highly Effective People', author: 'Stephen R. Covey', price: 7500, synopsis: "One of the most influential business books ever written. Covey presents seven habits that align character and competence: be proactive; begin with the end in mind; put first things first; think win-win; seek first to understand; synergise; and sharpen the saw.", authorBio: 'Stephen R. Covey was an American educator, author, and businessman.', reviews: [], coverImageUrl: 'https://i.imgur.com/JwTajMO.jpeg', publicationDate: '1989-08-15', pageCount: 381, category: 'BUSINESS' },
    { id: 78, title: 'The 80/20 Principle', author: 'Richard Koch', price: 6500, synopsis: "Based on the Pareto Principle — 80% of results come from 20% of causes — Koch shows how this insight can be applied to every aspect of business and life. By identifying the 20% of activities that produce 80% of value, you can work less, earn more, and achieve more.", authorBio: 'Richard Koch is a British author and consultant.', reviews: [], coverImageUrl: 'https://i.imgur.com/xs7Z5mv.jpeg', publicationDate: '1997', pageCount: 288, category: 'BUSINESS' },
    { id: 79, title: 'The 10X Rule', author: 'Grant Cardone', price: 7500, synopsis: "Cardone's argument that the single biggest mistake most people make is setting goals and targets that are too low. The 10X Rule states that you should set targets 10 times higher than you think you need and take 10 times more action than you think necessary — because success requires far more effort than people expect.", authorBio: 'Grant Cardone is an American author and entrepreneur.', reviews: [], coverImageUrl: 'https://i.imgur.com/3ilLfDC.jpeg', publicationDate: '2011-04-26', pageCount: 240, category: 'BUSINESS' },
    { id: 80, title: 'So Good They Can\'t Ignore You', author: 'Cal Newport', price: 8500, synopsis: "A challenge to the conventional wisdom of 'follow your passion.' Newport argues that passion is the result of mastery, not its prerequisite — and that the path to a fulfilling career lies in developing rare and valuable skills (career capital) and then using them to build work that matters to you.", authorBio: 'Cal Newport is a computer science professor and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/t4npeU3.jpeg', publicationDate: '2012-09-18', pageCount: 304, category: 'BUSINESS' },
    { id: 81, title: 'The Psychology of Money', author: 'Morgan Housel', price: 7000, synopsis: "Nineteen short stories exploring the strange ways people think about money. Housel argues that doing well with money has little to do with intelligence and everything to do with behavior. Financial success depends on your relationship with greed, fear, and time — not spreadsheets.", authorBio: 'Morgan Housel is a former columnist at The Motley Fool and The Wall Street Journal.', reviews: [], coverImageUrl: 'https://i.imgur.com/65nL1js.jpeg', publicationDate: '2020-09-07', pageCount: 242, category: 'PSYCHOLOGY' },
    { id: 82, title: 'The Courage to Be Disliked', author: 'Ichiro Kishimi & Fumitake Koga', price: 8500, synopsis: "A dialogue between a philosopher and a young man that introduces the ideas of Alfred Adler, the largely overlooked founder of individual psychology. Adler argues that all problems are interpersonal relationship problems, that trauma does not exist as we commonly understand it, and that happiness is the courage to accept being disliked by others.", authorBio: 'Ichiro Kishimi & Fumitake Koga are authors who explore Adlerian psychology.', reviews: [], coverImageUrl: 'https://i.imgur.com/mLsgJhC.jpeg', publicationDate: '2018-05-08', pageCount: 288, category: 'PSYCHOLOGY' },
    { id: 83, title: 'Think for Yourself', author: 'Thibaut Meurisse', price: 6500, synopsis: "A practical guide to overcoming cognitive biases, avoiding deception, and developing genuine critical thinking. Meurisse argues that most people do not think — they absorb beliefs from their environment and defend them as their own. The book provides tools to question assumptions, identify propaganda, and form more accurate views of the world.", authorBio: 'Thibaut Meurisse is an author focusing on productivity and personal development.', reviews: [], coverImageUrl: 'https://i.imgur.com/fjqOUDq.jpeg', publicationDate: '2020', pageCount: 154, category: 'PSYCHOLOGY' },
    { id: 84, title: '12 Rules for Life', author: 'Jordan B. Peterson', price: 11000, synopsis: "An antidote to chaos. Peterson draws on mythology, religion, neuroscience, and his clinical practice to offer twelve practical rules for living: from 'stand up straight with your shoulders back' to 'tell the truth — or, at least, don't lie.' A challenging exploration of responsibility, meaning, and the necessity of suffering.", authorBio: 'Jordan B. Peterson is a clinical psychologist and professor.', reviews: [], coverImageUrl: 'https://i.imgur.com/7IKquav.jpeg', publicationDate: '2018-01-23', pageCount: 409, category: 'PSYCHOLOGY' },
    { id: 85, title: 'Surrounded by Idiots', author: 'Thomas Erikson', price: 7500, synopsis: "An accessible introduction to the DISC model of human behaviour, which categorises people into four types: Red (dominant), Yellow (inspiring), Green (stable), and Blue (analytical). Erikson shows how understanding these types improves communication, reduces conflict, and helps you work with people who seem completely incomprehensible.", authorBio: 'Thomas Erikson is a Swedish author.', reviews: [], coverImageUrl: 'https://i.imgur.com/vrxKwNq.jpeg', publicationDate: '2019', pageCount: 285, category: 'PSYCHOLOGY' },
    { id: 86, title: 'Influence', author: 'Robert B. Cialdini', price: 12500, synopsis: "A seminal examination of the six universal principles of persuasion: reciprocity, commitment and consistency, social proof, authority, liking, and scarcity. Cialdini spent years studying compliance professionals — salespeople, advertisers, fundraisers — to understand why people say yes and how this knowledge can be used and defended against.", authorBio: 'Robert B. Cialdini is an American psychologist.', reviews: [], coverImageUrl: 'https://i.imgur.com/YOLKaCd.jpeg', publicationDate: '2021', pageCount: 336, category: 'PSYCHOLOGY' },
    { id: 87, title: 'Set Boundaries, Find Peace', author: 'Nedra Glennon Tawwab', price: 6500, synopsis: "A practical guide to setting healthy boundaries in every area of life — work, family, romantic relationships, and friendships. Tawwab, a therapist, argues that most anxiety, resentment, burnout, and unhappiness stem from a lack of clear boundaries, and shows readers how to identify, communicate, and maintain them.", authorBio: 'Nedra Glennon Tawwab is a licensed therapist and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/U6VGTuU.jpeg', publicationDate: '2021-03-16', pageCount: 272, category: 'PSYCHOLOGY' },
    { id: 88, title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', price: 11000, synopsis: "A tour de force of behavioural economics. Kahneman presents the two systems that drive the way we think: System 1 (fast, intuitive, emotional) and System 2 (slow, deliberate, logical). He reveals the cognitive biases that cause us to make poor decisions and shows how we can make better choices by understanding when to trust each system.", authorBio: 'Daniel Kahneman is a psychologist and economist.', reviews: [], coverImageUrl: 'https://i.imgur.com/3GgZnb0.jpeg', publicationDate: '2011-10-25', pageCount: 499, category: 'PSYCHOLOGY' },
    { id: 89, title: 'Hidden Potential', author: 'Adam Grant', price: 5000, synopsis: "A challenge to the notion that talent is fixed. Grant argues that the greatest untapped source of human potential is not prodigies who start with natural ability but ordinary people who put in the work to develop extraordinary skills. A science-backed exploration of how to grow beyond your starting point.", authorBio: 'Adam Grant is an organizational psychologist and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/Mw0qcZ9.jpeg', publicationDate: '2023-10-03', pageCount: 288, category: 'PSYCHOLOGY' },
    { id: 90, title: 'Think Again', author: 'Adam Grant', price: 8000, synopsis: "A manifesto for the value of rethinking and unlearning. Grant argues that intelligence is not just about knowing — it's about knowing what you don't know, questioning your assumptions, and being willing to change your mind. In a world of increasing certainty, the ability to think again is the most undervalued skill.", authorBio: 'Adam Grant is an organizational psychologist and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/svyEX3c.jpeg', publicationDate: '2021-02-02', pageCount: 307, category: 'PSYCHOLOGY' },
    { id: 91, title: 'Emotional Intelligence Habits', author: 'Travis Bradberry', price: 7000, synopsis: "A practical guide to building emotional intelligence through specific, actionable habits. Bradberry presents strategies for improving self-awareness, self-management, social awareness, and relationship management — the four core skills of emotional intelligence.", authorBio: 'Travis Bradberry is an author and emotional intelligence expert.', reviews: [], coverImageUrl: 'https://i.imgur.com/nlesfqC.jpeg', publicationDate: '2023', pageCount: 336, category: 'PSYCHOLOGY' },
    { id: 92, title: 'The Laws of Human Nature', author: 'Robert Greene', price: 12500, synopsis: "A deep exploration of the forces that drive human behaviour. Greene examines 18 fundamental laws of human nature — from irrationality and narcissism to envy, grandiosity, and the compulsive nature of people's character — and shows how understanding these forces gives you power over yourself and others.", authorBio: 'Robert Greene is an American author.', reviews: [], coverImageUrl: 'https://i.imgur.com/3JURrGh.jpeg', publicationDate: '2018-10-23', pageCount: 624, category: 'PSYCHOLOGY' },
    { id: 93, title: 'Outliers', author: 'Malcolm Gladwell', price: 8500, synopsis: "A study of what makes successful people successful. Gladwell argues that excellence is not simply a function of individual talent or intelligence but of opportunity, cultural background, timing, and — famously — 10,000 hours of deliberate practice. Through case studies of Bill Gates, The Beatles, and Korean Air, he reveals the hidden advantages behind extraordinary achievement.", authorBio: 'Malcolm Gladwell is a Canadian author and journalist.', reviews: [], coverImageUrl: 'https://i.imgur.com/iDRS6Rj.jpeg', publicationDate: '2008-11-18', pageCount: 309, category: 'PSYCHOLOGY' },
    { id: 94, title: 'Master Your Emotions', author: 'Thibaut Meurisse', price: 7500, synopsis: "A practical guide to taking control of your emotions rather than being controlled by them. Meurisse explains how emotions are created, why they become destructive, and the specific techniques — from reframing to acceptance — that build emotional resilience and inner stability.", authorBio: 'Thibaut Meurisse is an author focusing on productivity and personal development.', reviews: [], coverImageUrl: 'https://i.imgur.com/nAjYaHK.jpeg', publicationDate: '2019', pageCount: 166, category: 'PSYCHOLOGY' },
    { id: 95, title: 'Read People Like a Book', author: 'Patrick King', price: 6500, synopsis: "A guide to reading body language, emotions, personalities, and intentions — decoding the hidden messages in everything people do and say. King draws on psychology, behavioural economics, and social science to help readers better understand human behaviour in real time.", authorBio: 'Patrick King is a social interaction coach and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/y3eMyXU.jpeg', publicationDate: '2020', pageCount: 190, category: 'PSYCHOLOGY' },
    { id: 96, title: 'Don\'t Believe Everything You Think', author: 'Joseph Nguyen', price: 6000, synopsis: "An exploration of why the root of all psychological suffering is thinking — specifically, our habit of believing every thought that passes through our mind. Nguyen argues that freedom comes not from positive thinking but from no longer identifying with thought itself, drawing on principles of non-duality and mindfulness.", authorBio: 'Joseph Nguyen is an author focused on mental and emotional well-being.', reviews: [], coverImageUrl: 'https://i.imgur.com/tg6S7FC.jpeg', publicationDate: '2022-12-20', pageCount: 168, category: 'PSYCHOLOGY' },
    { id: 98, title: 'How to Talk to Anyone', author: 'Larry King', price: 7000, synopsis: "Ninety-two little tricks for big success in relationships. Lowndes provides specific, immediately applicable techniques for making a great first impression, mastering small talk, exuding confidence, and building rapport with anyone in any situation — from casual social events to high-stakes professional encounters.", authorBio: 'Larry King', reviews: [], coverImageUrl: 'https://i.imgur.com/iosCVcu.jpeg', publicationDate: '1999', pageCount: 304, category: 'PSYCHOLOGY' },
    { id: 99, title: 'Dopamine Detox', author: 'Thibaut Meurisse', price: 6500, synopsis: "A guide to reclaiming control of your attention in an age of addictive technology. Meurisse explains how constant stimulation from social media, entertainment, and notifications depletes motivation and focus, and provides a practical protocol for resetting your dopamine system to restore drive and clarity.", authorBio: 'Thibaut Meurisse is an author focusing on productivity and personal development.', reviews: [], coverImageUrl: 'https://i.imgur.com/uiUhNhP.jpeg', publicationDate: '2020', pageCount: 132, category: 'PSYCHOLOGY' },
    { id: 100, title: 'Attached', author: 'Amir Levine & Rachel Heller', price: 6500, synopsis: "An application of attachment theory to adult romantic relationships. Levine and Heller identify three attachment styles — secure, anxious, and avoidant — and show how understanding your own attachment style (and your partner's) can transform your relationships by helping you recognise patterns and communicate more effectively.", authorBio: 'Amir Levine & Rachel Heller', reviews: [], coverImageUrl: 'https://i.imgur.com/6h0zwgE.jpeg', publicationDate: '2011-01-04', pageCount: 294, category: 'PSYCHOLOGY' },
    { id: 102, title: 'Crime and Punishment', author: 'Fyodor Dostoevsky', price: 16500, synopsis: "The story of Raskolnikov, a destitute student in St. Petersburg who murders a pawnbroker, believing himself to be above conventional morality. The novel traces his psychological torment, his attempts to rationalise the crime, and his ultimate journey toward confession and redemption. One of the greatest psychological novels ever written.", authorBio: 'Fyodor Dostoevsky was a Russian novelist.', reviews: [], coverImageUrl: 'https://i.imgur.com/qA2cW3K.jpeg', publicationDate: '1866', pageCount: 545, category: 'FICTION' },
    { id: 103, title: 'The Daily Stoic', author: 'Ryan Holiday & Stephen Hanselman', price: 10000, synopsis: "A structured daily guide to Stoic philosophy, offering 366 short readings — one for each day of the year. Each entry presents timeless teachings from Stoic philosophers like Marcus Aurelius, Seneca, and Epictetus, paired with modern reflections to help readers build resilience, discipline, and emotional control.", authorBio: 'Ryan Holiday is an American author and media strategist.', reviews: [], coverImageUrl: 'https://i.imgur.com/h5LsiFs.jpeg', publicationDate: '2016', pageCount: 416, category: 'PSYCHOLOGY' },
    { id: 104, title: 'Ego is the Enemy', author: 'Ryan Holiday', price: 6500, synopsis: "This book explores how ego — our inflated sense of self-importance — becomes a major obstacle to success, learning, and fulfillment. Using historical figures, athletes, and leaders, it shows how ego can sabotage ambition and how humility and discipline create lasting achievement.", authorBio: 'Ryan Holiday is an American author and media strategist.', reviews: [], coverImageUrl: 'https://i.imgur.com/qDDg9Du.jpeg', publicationDate: '2016', pageCount: 226, category: 'PSYCHOLOGY' },
    { id: 105, title: 'Man\'s Search for Meaning', author: 'Viktor E. Frankl', price: 7000, synopsis: "A powerful memoir of Holocaust survival combined with psychological insight. Viktor Frankl describes his experiences in Nazi concentration camps and develops logotherapy, a psychological approach centered on finding meaning in life even under extreme suffering.", authorBio: 'Viktor E. Frankl was an Austrian psychiatrist and psychotherapist.', reviews: [], coverImageUrl: 'https://i.imgur.com/U2LtcO4.jpeg', publicationDate: '1959', pageCount: 200, category: 'PSYCHOLOGY' },
    { id: 106, title: 'Never Split the Difference', author: 'Chris Voss (with Tahl Raz)', price: 8500, synopsis: "A negotiation guide based on real FBI hostage negotiation tactics. It teaches psychological techniques for persuasion, emotional intelligence, and communication strategies that help achieve better outcomes in business and everyday life.", authorBio: 'Chris Voss is a consultant and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/hlGfh7s.jpeg', publicationDate: '2016', pageCount: 288, category: 'PSYCHOLOGY' },
    { id: 107, title: 'Why Nations Fail', author: 'Daron Acemoglu & James A. Robinson', price: 10000, synopsis: "A landmark work arguing that the key driver of national prosperity or poverty is not geography, culture, or ignorance but political and economic institutions. Nations with inclusive institutions thrive; those with extractive institutions — designed to pull wealth to a small elite — stagnate. Draws on centuries of history across dozens of countries.", authorBio: 'Daron Acemoglu & James A. Robinson are economists and political scientists.', reviews: [], coverImageUrl: 'https://i.imgur.com/F26VjUn.jpeg', publicationDate: '2012-03-20', pageCount: 529, category: 'HISTORY' },
    { id: 108, title: 'The State of Africa', author: 'Martin Meredith', price: 12500, synopsis: "A comprehensive history of Africa since independence, tracing the fortunes of fifty countries from the euphoria of liberation in the 1950s and 1960s through decades of conflict, corruption, and economic collapse, to the tentative signs of renaissance at the turn of the century. A definitive work on post-colonial Africa.", authorBio: 'Martin Meredith is a historian and journalist.', reviews: [], coverImageUrl: 'https://i.imgur.com/M9mdzPi.jpeg', publicationDate: '2005', pageCount: 752, category: 'HISTORY' },
    { id: 109, title: 'The Fortunes of Africa', author: 'Martin Meredith', price: 12500, synopsis: "A sweeping narrative of 5,000 years of African history — from the gold empires of West Africa and the kingdoms of the East African coast to the modern era of oil wealth and persistent poverty. Meredith shows how Africa's vast natural resources have driven both its glory and its exploitation.", authorBio: 'Martin Meredith is a historian and journalist.', reviews: [], coverImageUrl: 'https://i.imgur.com/3JURrGh.jpeg', publicationDate: '2014-10-21', pageCount: 784, category: 'HISTORY' },
    { id: 110, title: 'My Command', author: 'Benjamin Adekunle', price: 8500, synopsis: "The memoir of Benjamin Adekunle — the 'Black Scorpion' — one of Nigeria's most controversial military commanders during the Nigerian Civil War (1967–1970). Adekunle commanded the Third Marine Commando Division and led the military campaign that crushed Biafra. A rare first-hand account of the war from the Federal side.", authorBio: 'Benjamin Adekunle was a Nigerian military commander.', reviews: [], coverImageUrl: 'https://i.imgur.com/gAkuNjf.jpeg', publicationDate: '1969', pageCount: 0, category: 'HISTORY' },
    { id: 111, title: 'There Was a Country', author: 'Chinua Achebe', price: 7500, synopsis: "A personal history of Biafra — Nigeria's failed breakaway republic during the civil war of 1967–1970. Achebe, a Biafran himself, combines memoir with political analysis to explore the causes, events, and aftermath of the war that killed between 1 and 3 million people, mostly from starvation. A powerful final statement from Africa's greatest novelist.", authorBio: 'Chinua Achebe was a Nigerian novelist and poet.', reviews: [], coverImageUrl: 'https://i.imgur.com/xIQp4f9.jpeg', publicationDate: '2012-10-04', pageCount: 352, category: 'HISTORY' },
    { id: 112, title: 'How Europe Underdeveloped Africa', author: 'Walter Rodney', price: 6500, synopsis: "A landmark work of African intellectual history arguing that Europe's development and Africa's underdevelopment are not separate processes but two sides of the same coin. Rodney systematically demonstrates how colonialism extracted Africa's resources, disrupted its institutions, and created the structural dependency that persists to this day.", authorBio: 'Walter Rodney was a Guyanese historian.', reviews: [], coverImageUrl: 'https://i.imgur.com/ER6NGtC.jpeg', publicationDate: '1972', pageCount: 316, category: 'HISTORY' },
    { id: 113, title: 'Why We Struck', author: 'Adewale Ademoyega', price: 7000, synopsis: "A first-hand account of the January 1966 Nigerian military coup by one of the coup planners. Ademoyega, a major in the Nigerian Army, explains the motivations, planning, and execution of the coup that ended Nigeria's First Republic. An essential primary source for understanding Nigerian political history.", authorBio: 'Adewale Ademoyega was a Nigerian army officer.', reviews: [], coverImageUrl: 'https://i.imgur.com/pS3XAPv.jpeg', publicationDate: '1981', pageCount: 168, category: 'HISTORY' },
    { id: 114, title: 'Woes of Ikenga', author: 'Ndubuisi George', price: 5000, synopsis: "A Nigerian novel tracing the story of Ikenga, a young man who leaves his war-torn community in search of a better life in Europe. He encounters the grim realities of life as an illegal immigrant in Germany — poverty, police harassment, demeaning work, sham marriages, and imprisonment. A powerful warning against the 'greener pastures' illusion.", authorBio: 'Ndubuisi George is a Nigerian author.', reviews: [], coverImageUrl: 'https://i.imgur.com/U4yon07.jpeg', publicationDate: '2014', pageCount: 300, category: 'FICTION' },
    { id: 115, title: 'Roots', author: 'Alex Haley', price: 12500, synopsis: "The epic saga of an African-American family beginning with Kunta Kinte, captured in The Gambia in 1767 and sold into slavery, and continuing through seven generations to Haley himself. Part historical fiction, part family memoir, Roots is a monumental work about identity, ancestry, and the enduring human spirit.", authorBio: 'Alex Haley was an American author.', reviews: [], coverImageUrl: 'https://i.imgur.com/CBI4vK6.jpeg', publicationDate: '1976-10-01', pageCount: 729, category: 'FICTION' },
    { id: 116, title: 'China After Mao', author: 'Frank Dikotter', price: 7500, synopsis: "A sweeping history of China from Mao's death in 1976 to the present, tracing how the Communist Party survived its darkest crises and emerged as a global superpower. Dikotter examines the economic reforms, political repression, and cultural shifts that transformed China — arguing the party achieved stability through control, not prosperity.", authorBio: 'Frank Dikotter is a historian.', reviews: [], coverImageUrl: 'https://i.imgur.com/7RnfCc7.jpeg', publicationDate: '2022-11-01', pageCount: 416, category: 'HISTORY' },
    { id: 117, title: 'Churchill', author: 'Andrew Roberts', price: 11000, synopsis: "Drawing on previously unseen diaries, letters, and documents from 41 archives, Roberts presents a comprehensive biography of Winston Churchill. He portrays a leader of extraordinary courage and complexity — flawed, determined, and utterly indispensable at the moment history required him.", authorBio: 'Andrew Roberts is a British historian.', reviews: [], coverImageUrl: 'https://i.imgur.com/MLXasbS.jpeg', publicationDate: '2018-10-09', pageCount: 982, category: 'HISTORY' },
    { id: 118, title: 'The Looting Machine', author: 'Tom Burgis', price: 7500, synopsis: "An investigation into how Africa's vast natural wealth — oil, diamonds, gold, coltan — is extracted by a nexus of corrupt elites, multinational corporations, and foreign governments, leaving ordinary Africans impoverished. A devastating account of resource extraction as organised pillage.", authorBio: 'Tom Burgis is an investigative journalist.', reviews: [], coverImageUrl: 'https://i.imgur.com/Ojp8td7.jpeg', publicationDate: '2015-02-26', pageCount: 336, category: 'HISTORY' },
    { id: 119, title: 'Dictatorland', author: 'Paul Kenyon', price: 11000, synopsis: "A panoramic portrait of seven African dictators — from Idi Amin in Uganda to Robert Mugabe in Zimbabwe — tracing how they came to power, how they ruled, and what happened to their countries. A gripping and disturbing account of modern African authoritarianism.", authorBio: 'Paul Kenyon is a BBC journalist and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/wgzYygS.jpeg', publicationDate: '2018-04-06', pageCount: 432, category: 'HISTORY' },
    { id: 120, title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', price: 10000, synopsis: "A sweeping narrative of human history from the emergence of Homo sapiens in Africa 70,000 years ago to the present. Harari argues that what makes humans unique is not intelligence but the ability to believe in shared fictions — myths, religions, nations, money — that allow large-scale cooperation. A book that changes how you see everything.", authorBio: 'Yuval Noah Harari is a historian and professor.', reviews: [], coverImageUrl: 'https://i.imgur.com/FJDgXck.jpeg', publicationDate: '2014', pageCount: 443, category: 'HISTORY' },
    { id: 121, title: 'Nigeria\'s Soldiers of Fortune', author: 'Max Siollun', price: 7500, synopsis: "A meticulous account of Nigeria's turbulent military era from 1983 to 1993 — from the Buhari coup through Babangida's controversial tenure. Siollun draws on interviews with key figures and previously classified documents to reveal the inner workings of military rule and its lasting impact on Nigerian democracy.", authorBio: 'Max Siollun is a Nigerian historian and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/jQ9FF8T.jpeg', publicationDate: '2013-02-18', pageCount: 334, category: 'HISTORY' },
    { id: 122, title: 'Why Nations Fail', author: 'Daron Acemoglu & James A. Robinson', price: 10000, synopsis: "A landmark work arguing that the key driver of national prosperity or poverty is not geography, culture, or ignorance but political and economic institutions. Nations with inclusive institutions thrive; those with extractive institutions — designed to pull wealth to a small elite — stagnate. Draws on centuries of history across dozens of countries.", authorBio: 'Daron Acemoglu & James A. Robinson are economists and political scientists.', reviews: [], coverImageUrl: 'https://i.imgur.com/F26VjUn.jpeg', publicationDate: '2012-03-20', pageCount: 529, category: 'POLITICS' },
    { id: 123, title: 'The Prince', author: 'Niccolo Machiavelli', price: 6500, synopsis: "Written in 1513 and published posthumously in 1532, The Prince is a political treatise that examines how rulers acquire and maintain power. Machiavelli dispensed with idealism in favour of political realism — arguing that effective leadership sometimes requires deception, force, and the appearance of virtue over its reality. One of the most influential political texts ever written.", authorBio: 'Niccolo Machiavelli was an Italian diplomat and political theorist.', reviews: [], coverImageUrl: 'https://i.imgur.com/CEaOrjA.jpeg', publicationDate: '1532', pageCount: 140, category: 'POLITICS' },
    { id: 124, title: 'The State of Africa', author: 'Martin Meredith', price: 12500, synopsis: "A comprehensive history of Africa since independence, tracing the fortunes of fifty countries from the euphoria of liberation in the 1950s and 1960s through decades of conflict, corruption, and economic collapse, to the tentative signs of renaissance at the turn of the century. A definitive work on post-colonial Africa.", authorBio: 'Martin Meredith is a historian and journalist.', reviews: [], coverImageUrl: 'https://i.imgur.com/M9mdzPi.jpeg', publicationDate: '2005', pageCount: 752, category: 'POLITICS' },
    { id: 125, title: 'The Fortunes of Africa', author: 'Martin Meredith', price: 12500, synopsis: "A sweeping narrative of 5,000 years of African history — from the gold empires of West Africa and the kingdoms of the East African coast to the modern era of oil wealth and persistent poverty. Meredith shows how Africa's vast natural resources have driven both its glory and its exploitation.", authorBio: 'Martin Meredith is a historian and journalist.', reviews: [], coverImageUrl: 'https://i.imgur.com/3JURrGh.jpeg', publicationDate: '2014-10-21', pageCount: 784, category: 'POLITICS' },
    { id: 126, title: 'My Command', author: 'Benjamin Adekunle', price: 8500, synopsis: "The memoir of Benjamin Adekunle — the 'Black Scorpion' — one of Nigeria's most controversial military commanders during the Nigerian Civil War (1967–1970). Adekunle commanded the Third Marine Commando Division and led the military campaign that crushed Biafra. A rare first-hand account of the war from the Federal side.", authorBio: 'Benjamin Adekunle was a Nigerian military commander.', reviews: [], coverImageUrl: 'https://i.imgur.com/gAkuNjf.jpeg', publicationDate: '1969', pageCount: 0, category: 'POLITICS' },
    { id: 127, title: 'There Was a Country', author: 'Chinua Achebe', price: 7500, synopsis: "A personal history of Biafra — Nigeria's failed breakaway republic during the civil war of 1967–1970. Achebe, a Biafran himself, combines memoir with political analysis to explore the causes, events, and aftermath of the war that killed between 1 and 3 million people, mostly from starvation.", authorBio: 'Chinua Achebe was a Nigerian novelist and poet.', reviews: [], coverImageUrl: 'https://i.imgur.com/xIQp4f9.jpeg', publicationDate: '2012-10-04', pageCount: 352, category: 'POLITICS' },
    { id: 128, title: 'How Europe Underdeveloped Africa', author: 'Walter Rodney', price: 6500, synopsis: "A landmark work of African intellectual history arguing that Europe's development and Africa's underdevelopment are not separate processes but two sides of the same coin. Rodney systematically demonstrates how colonialism extracted Africa's resources, disrupted its institutions, and created the structural dependency that persists to this day.", authorBio: 'Walter Rodney was a Guyanese historian.', reviews: [], coverImageUrl: 'https://i.imgur.com/ER6NGtC.jpeg', publicationDate: '1972', pageCount: 316, category: 'POLITICS' },
    { id: 129, title: 'Why We Struck', author: 'Adewale Ademoyega', price: 7000, synopsis: "A first-hand account of the January 1966 Nigerian military coup by one of the coup planners. Ademoyega explains the motivations, planning, and execution of the coup that ended Nigeria's First Republic. An essential primary source for understanding Nigerian political history.", authorBio: 'Adewale Ademoyega was a Nigerian army officer.', reviews: [], coverImageUrl: 'https://i.imgur.com/pS3XAPv.jpeg', publicationDate: '1981', pageCount: 168, category: 'POLITICS' },
    { id: 130, title: 'The 48 Laws of Power', author: 'Robert Greene', price: 8000, synopsis: "A ruthlessly practical manual of power drawn from the lives of historical figures — from Machiavelli and Sun Tzu to Queen Elizabeth I and Henry Kissinger. Greene distils 48 laws that govern how power is acquired, maintained, and lost. Both a guide and a warning: know these laws to use them and defend against those who do.", authorBio: 'Robert Greene is an American author.', reviews: [], coverImageUrl: 'https://i.imgur.com/j93FKvo.jpeg', publicationDate: '1998-09-01', pageCount: 452, category: 'POLITICS' },
    { id: 131, title: 'The Art of War', author: 'Sun Tzu', price: 7500, synopsis: "An ancient Chinese military treatise attributed to Sun Tzu, a military general from the 5th century BC. Composed of 13 chapters, each addressing a different aspect of warfare, it remains the most influential strategy text ever written — applied today to business, law, politics, and competitive strategy.", authorBio: 'Sun Tzu was a Chinese general and military strategist.', reviews: [], coverImageUrl: 'https://i.imgur.com/JWnMVZK.jpeg', publicationDate: 'c. 500 BC', pageCount: 68, category: 'POLITICS' },
    { id: 132, title: 'China After Mao', author: 'Frank Dikotter', price: 7500, synopsis: "A sweeping history of China from Mao's death in 1976 to the present, tracing how the Communist Party survived its darkest crises and emerged as a global superpower. Dikotter examines the economic reforms, political repression, and cultural shifts that transformed China — arguing the party achieved stability through control, not prosperity.", authorBio: 'Frank Dikotter is a historian.', reviews: [], coverImageUrl: 'https://i.imgur.com/7RnfCc7.jpeg', publicationDate: '2022-11-01', pageCount: 416, category: 'POLITICS' },
    { id: 133, title: 'Churchill', author: 'Andrew Roberts', price: 11000, synopsis: "Drawing on previously unseen diaries, letters, and documents from 41 archives, Roberts presents a comprehensive biography of Winston Churchill. He portrays a leader of extraordinary courage and complexity — flawed, determined, and utterly indispensable at the moment history required him.", authorBio: 'Andrew Roberts is a British historian.', reviews: [], coverImageUrl: 'https://i.imgur.com/MLXasbS.jpeg', publicationDate: '2018-10-09', pageCount: 982, category: 'POLITICS' },
    { id: 134, title: 'Margaret Thatcher: The Iron Lady', author: 'John Campbell', price: 10000, synopsis: "The definitive two-volume biography of Britain's first and only female Prime Minister, condensed into one volume. Campbell examines Thatcher's rise from grocer's daughter to the most powerful politician in Britain, her decade of radical governance, and her divisive legacy — without either hagiography or demonisation.", authorBio: 'John Campbell is a British historian.', reviews: [], coverImageUrl: 'https://i.imgur.com/MYQ5f0z.jpeg', publicationDate: '2009', pageCount: 576, category: 'POLITICS' },
    { id: 135, title: 'The Looting Machine', author: 'Tom Burgis', price: 7500, synopsis: "An investigation into how Africa's vast natural wealth is extracted by a nexus of corrupt elites, multinational corporations, and foreign governments, leaving ordinary Africans impoverished. A devastating account of resource extraction as organised pillage.", authorBio: 'Tom Burgis is an investigative journalist.', reviews: [], coverImageUrl: 'https://i.imgur.com/Ojp8td7.jpeg', publicationDate: '2015-02-26', pageCount: 336, category: 'POLITICS' },
    { id: 136, title: 'Dictatorland', author: 'Paul Kenyon', price: 11000, synopsis: "A panoramic portrait of seven African dictators — from Idi Amin in Uganda to Robert Mugabe in Zimbabwe — tracing how they came to power, how they ruled, and what happened to their countries. A gripping and disturbing account of modern African authoritarianism.", authorBio: 'Paul Kenyon is a BBC journalist and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/wgzYygS.jpeg', publicationDate: '2018-04-06', pageCount: 432, category: 'POLITICS' },
    { id: 137, title: 'Trump: The Art of the Deal', author: 'Donald Trump & Tony Schwartz', price: 7500, synopsis: "Part memoir, part business philosophy, Trump recounts major deals from his career in real estate and entertainment, outlining the principles he claims have guided his success: think big, protect the downside, maximise your options, know your market, and use leverage.", authorBio: 'Donald Trump & Tony Schwartz', reviews: [], coverImageUrl: 'https://i.imgur.com/JNvmm20.jpeg', publicationDate: '1987-11-01', pageCount: 246, category: 'POLITICS' },
    { id: 138, title: 'Gandhi: An Autobiography', author: 'Mahatma Gandhi', price: 8000, synopsis: "Gandhi's own account of his experiments with truth — from his childhood in Gujarat and his years as a lawyer in South Africa to his emergence as the leader of India's independence movement. A candid, searching self-examination that doubles as one of the great political memoirs of the 20th century.", authorBio: 'Mahatma Gandhi', reviews: [], coverImageUrl: 'https://i.imgur.com/Kc8tJgl.jpeg', publicationDate: '1940', pageCount: 528, category: 'POLITICS' },
    { id: 139, title: 'Animal Farm', author: 'George Orwell', price: 6000, synopsis: "A satirical allegory that tells the story of farm animals who overthrow their human farmer in hopes of creating an equal society. However, the pigs gradually become corrupt and establish a dictatorship that mirrors the tyranny they replaced. The story is a critique of political systems that betray revolutionary ideals, especially totalitarian regimes.", authorBio: 'George Orwell', reviews: [], coverImageUrl: 'https://i.imgur.com/J4xxEi2.jpeg', publicationDate: '1945', pageCount: 112, category: 'FICTION' },
    { id: 140, title: 'To Kill A Mockingbird', author: 'Harper Lee', price: 5000, synopsis: "Set in the racially segregated American South during the 1930s, the novel follows young Scout Finch as she observes her father, Atticus Finch, defend a Black man falsely accused of raping a white woman. Through her perspective, the book explores themes of racial injustice, moral growth, empathy, and the loss of innocence.", authorBio: 'Harper Lee', reviews: [], coverImageUrl: 'https://i.imgur.com/Zo7VQxT.jpeg', publicationDate: '1960', pageCount: 281, category: 'FICTION' },
    { id: 141, title: 'The Courage to Be Disliked', author: 'Ichiro Kishimi & Fumitake Koga', price: 8500, synopsis: "A dialogue between a philosopher and a young man that introduces the ideas of Alfred Adler, the largely overlooked founder of individual psychology. Adler argues that all problems are interpersonal relationship problems, that trauma does not exist as we commonly understand it, and that happiness is the courage to accept being disliked by others.", authorBio: 'Ichiro Kishimi & Fumitake Koga are authors who explore Adlerian philosophy.', reviews: [], coverImageUrl: 'https://i.imgur.com/mLsgJhC.jpeg', publicationDate: '2018-05-08', pageCount: 288, category: 'PHILOSOPHY' },
    { id: 142, title: 'The Alchemist', author: 'Paulo Coelho', price: 6500, synopsis: "The story of Santiago, a young Andalusian shepherd who dreams of finding treasure near the Egyptian pyramids. His journey becomes an allegory for following one's personal legend — the soul of the world's belief that when you truly want something, the universe conspires to help you achieve it. A meditation on destiny, purpose, and the courage to pursue dreams.", authorBio: 'Paulo Coelho is a Brazilian author.', reviews: [], coverImageUrl: 'https://i.imgur.com/tLfFzYp.jpeg', publicationDate: '1993', pageCount: 163, category: 'FICTION' },
    { id: 201, title: 'Noughts & Crosses', author: 'Malorie Blackman', price: 5000, synopsis: "A dystopian series set in an alternate world where Black people (Crosses) hold all power and white people (Noughts) are a marginalised underclass. At the centre is the love story of Sephy, a Cross girl, and Callum, a Nought boy. The series is a devastating exploration of racism, power, prejudice, and the cost of moral courage.", authorBio: 'Malorie Blackman is a British author.', reviews: [], coverImageUrl: 'https://i.imgur.com/9WvF8op.jpeg', publicationDate: '2001', pageCount: 386, category: 'FICTION' },
    { id: 143, title: 'The Power of Now', author: 'Eckhart Tolle', price: 7500, synopsis: "A guide to spiritual enlightenment through the practice of present-moment awareness. Tolle argues that the source of most human suffering is identification with the thinking mind and its obsession with past and future. By learning to observe thoughts rather than identify with them, one discovers a state of peace and presence beneath all thought.", authorBio: 'Eckhart Tolle is a spiritual teacher and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/zkDK8eb.jpeg', publicationDate: '1999', pageCount: 236, category: 'PHILOSOPHY' },
    { id: 144, title: '12 Rules for Life', author: 'Jordan B. Peterson', price: 11000, synopsis: "An antidote to chaos. Peterson draws on mythology, religion, neuroscience, and his clinical practice to offer twelve practical rules for living. A challenging exploration of responsibility, meaning, and the necessity of suffering.", authorBio: 'Jordan B. Peterson is a clinical psychologist and professor.', reviews: [], coverImageUrl: 'https://i.imgur.com/7IKquav.jpeg', publicationDate: '2018-01-23', pageCount: 409, category: 'PHILOSOPHY' },
    { id: 145, title: 'The Prince', author: 'Niccolo Machiavelli', price: 6500, synopsis: "Written in 1513 and published posthumously in 1532, The Prince is a political treatise that examines how rulers acquire and maintain power. Machiavelli dispensed with idealism in favour of political realism. One of the most influential political texts ever written.", authorBio: 'Niccolo Machiavelli was an Italian diplomat and political theorist.', reviews: [], coverImageUrl: 'https://i.imgur.com/CEaOrjA.jpeg', publicationDate: '1532', pageCount: 140, category: 'PHILOSOPHY' },
    { id: 146, title: 'Right Thing, Right Now', author: 'Ryan Holiday', price: 7500, synopsis: "The third volume in Holiday's Stoic Virtues trilogy, exploring the virtue of justice. Drawing on the lives of Marcus Aurelius, Cato, and other Stoic figures, Holiday argues that doing the right thing — consistently, courageously, and without compromise — is not just an ethical imperative but the only path to genuine success and inner peace.", authorBio: 'Ryan Holiday is an American author and media strategist.', reviews: [], coverImageUrl: 'https://i.imgur.com/fGPRlJS.jpeg', publicationDate: '2024-05-14', pageCount: 304, category: 'PHILOSOPHY' },
    { id: 147, title: 'The School of Life', author: 'Alain de Botton & The School of Life', price: 7500, synopsis: "An emotional education — exploring what it means to be a good person, to have a good relationship, a fulfilling career, and a properly examined inner life. Drawing on philosophy, psychology, and literature, the book addresses the questions that matter most but are rarely discussed seriously.", authorBio: 'Alain de Botton is a British-Swiss philosopher and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/i4Cbd5w.jpeg', publicationDate: '2019', pageCount: 456, category: 'PHILOSOPHY' },
    { id: 148, title: 'Stillness Is the Key', author: 'Ryan Holiday', price: 7000, synopsis: "Drawing on Stoic, Buddhist, and other philosophical traditions, Holiday argues that inner stillness — the ability to slow down, be present, and find calm amidst chaos — is the secret weapon of the greatest leaders, athletes, artists, and thinkers in history.", authorBio: 'Ryan Holiday is an American author and media strategist.', reviews: [], coverImageUrl: 'https://i.imgur.com/GcpzxVd.jpeg', publicationDate: '2019-10-01', pageCount: 288, category: 'PHILOSOPHY' },
    { id: 149, title: 'The Art of War', author: 'Sun Tzu', price: 7500, synopsis: "An ancient Chinese military treatise attributed to Sun Tzu, a military general from the 5th century BC. Composed of 13 chapters, each addressing a different aspect of warfare, it remains the most influential strategy text ever written — applied today to business, law, politics, and competitive strategy.", authorBio: 'Sun Tzu was a Chinese general and military strategist.', reviews: [], coverImageUrl: 'https://i.imgur.com/JWnMVZK.jpeg', publicationDate: 'c. 500 BC', pageCount: 68, category: 'PHILOSOPHY' },
    { id: 150, title: 'The Obstacle Is the Way', author: 'Ryan Holiday', price: 7500, synopsis: "Drawing on the Stoic philosophy of Marcus Aurelius, Holiday argues that obstacles are not problems to be solved but opportunities to be embraced. Through historical examples from Marcus Aurelius to Amelia Earhart to Steve Jobs, he demonstrates that the impediment to action advances action — what stands in the way becomes the way.", authorBio: 'Ryan Holiday is an American author and media strategist.', reviews: [], coverImageUrl: 'https://i.imgur.com/YJ7toFO.jpeg', publicationDate: '2014-05-01', pageCount: 224, category: 'PHILOSOPHY' },
    { id: 151, title: 'Letters from a Stoic (Seneca)', author: 'Seneca', price: 7000, synopsis: "A selection of letters written by the Roman Stoic philosopher Seneca to his friend Lucilius during the last years of his life. The letters address fundamental questions about life, death, friendship, poverty, and how to live well — making them among the most personal and human of all ancient philosophical texts.", authorBio: 'Seneca was a Roman Stoic philosopher.', reviews: [], coverImageUrl: 'https://i.imgur.com/dyVGcHv.jpeg', publicationDate: 'c. 65 AD', pageCount: 256, category: 'PHILOSOPHY' },
    { id: 152, title: 'The Wealth Money Can\'t Buy', author: 'Robin Sharma', price: 7500, synopsis: "Sharma's exploration of the eight forms of wealth beyond money — growth, wellness, family, craft, community, adventure, service, and soulfulness. He argues that true richness means thriving in all eight areas, and provides a framework for building a life of genuine abundance.", authorBio: 'Robin Sharma is a Canadian writer and leadership expert.', reviews: [], coverImageUrl: 'https://i.imgur.com/M4MnoF8.jpeg', publicationDate: '2024-01-30', pageCount: 288, category: 'PHILOSOPHY' },
    { id: 153, title: 'As a Man Thinketh', author: 'James Allen', price: 6500, synopsis: "A slim but profound essay on the power of thought. Allen argues that a person is literally what they think — that character, circumstance, health, and achievement are all direct products of habitual thinking. One of the earliest and most influential self-help texts ever written.", authorBio: 'James Allen was a British philosophical writer.', reviews: [], coverImageUrl: 'https://i.imgur.com/u5jt1PP.jpeg', publicationDate: '1903', pageCount: 52, category: 'PHILOSOPHY' },
    { id: 154, title: 'The Almanack of Naval Ravikant', author: 'Eric Jorgenson', price: 8500, synopsis: "A curated collection of Naval Ravikant's wisdom on wealth and happiness, assembled from his tweets, podcasts, and essays. Covers how to think about wealth creation, leverage, specific knowledge, and the foundations of a happy life — all distilled from one of Silicon Valley's most respected thinkers.", authorBio: 'Eric Jorgenson is an author and entrepreneur.', reviews: [], coverImageUrl: 'https://i.imgur.com/lLlaffU.jpeg', publicationDate: '2020', pageCount: 242, category: 'PHILOSOPHY' },
    { id: 155, title: 'The Daily Stoic', author: 'Ryan Holiday & Stephen Hanselman', price: 10000, synopsis: "A structured daily guide to Stoic philosophy, offering 366 short readings — one for each day of the year. Each entry presents timeless teachings from Stoic philosophers like Marcus Aurelius, Seneca, and Epictetus, paired with modern reflections to help readers build resilience, discipline, and emotional control.", authorBio: 'Ryan Holiday is an American author and media strategist.', reviews: [], coverImageUrl: 'https://i.imgur.com/h5LsiFs.jpeg', publicationDate: '2016', pageCount: 416, category: 'PHILOSOPHY' },
    { id: 156, title: 'Ego is the Enemy', author: 'Ryan Holiday', price: 6500, synopsis: "This book explores how ego — our inflated sense of self-importance — becomes a major obstacle to success, learning, and fulfillment. Using historical figures, athletes, and leaders, it shows how ego can sabotage ambition and how humility and discipline create lasting achievement.", authorBio: 'Ryan Holiday is an American author and media strategist.', reviews: [], coverImageUrl: 'https://i.imgur.com/qDDg9Du.jpeg', publicationDate: '2016', pageCount: 226, category: 'PHILOSOPHY' },
    { id: 157, title: 'Man\'s Search for Meaning', author: 'Viktor E. Frankl', price: 7000, synopsis: "A powerful memoir of Holocaust survival combined with psychological insight. Viktor Frankl describes his experiences in Nazi concentration camps and develops logotherapy, a psychological approach centered on finding meaning in life even under extreme suffering.", authorBio: 'Viktor E. Frankl was an Austrian psychiatrist and psychotherapist.', reviews: [], coverImageUrl: 'https://i.imgur.com/U2LtcO4.jpeg', publicationDate: '1959', pageCount: 200, category: 'PHILOSOPHY' },
    { id: 158, title: 'Can\'t Hurt Me', author: 'David Goggins', price: 9500, synopsis: "The extraordinary memoir of David Goggins — the only man to complete Navy SEAL training, Army Ranger School, and Air Force Tactical Air Controller training. Growing up in abject poverty with an abusive father, Goggins overcame obesity, racism, and self-doubt to become one of the world's greatest endurance athletes and the 'hardest man alive.'", authorBio: 'David Goggins is an American ultramarathon runner and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/92seEti.jpeg', publicationDate: '2018-12-04', pageCount: 364, category: 'BIOGRAPHIES' },
    { id: 159, title: 'Long Walk to Freedom', author: 'Nelson Mandela', price: 11000, synopsis: "The definitive autobiography of Nelson Mandela — from his rural childhood in the Transkei through 27 years in prison on Robben Island to his emergence as South Africa's first democratically elected president. A monumental work of courage, sacrifice, and moral leadership.", authorBio: 'Nelson Mandela was a South African anti-apartheid revolutionary.', reviews: [], coverImageUrl: 'https://i.imgur.com/SseVCKp.jpeg', publicationDate: '1997', pageCount: 600, category: 'BIOGRAPHIES' },
    { id: 160, title: 'My Command', author: 'Benjamin Adekunle', price: 8500, synopsis: "The memoir of Benjamin Adekunle — the 'Black Scorpion' — one of Nigeria's most controversial military commanders during the Nigerian Civil War (1967–1970). Adekunle commanded the Third Marine Commando Division and led the military campaign that crushed Biafra. A rare first-hand account of the war from the Federal side.", authorBio: 'Benjamin Adekunle was a Nigerian military commander.', reviews: [], coverImageUrl: 'https://i.imgur.com/gAkuNjf.jpeg', publicationDate: '1969', pageCount: 0, category: 'BIOGRAPHIES' },
    { id: 161, title: 'The Diary of a CEO', author: 'Steven Bartlett', price: 10000, synopsis: "Part memoir, part business guide, Bartlett shares the unfiltered story of building Social Chain from nothing to a publicly listed company by age 27. He reveals the psychological principles, counterintuitive laws, and hard lessons that shaped his success — including failure, mental health struggles, and imposter syndrome.", authorBio: 'Steven Bartlett is a British entrepreneur.', reviews: [], coverImageUrl: 'https://i.imgur.com/akXPM4F.jpeg', publicationDate: '2023-09-07', pageCount: 352, category: 'BIOGRAPHIES' },
    { id: 162, title: 'Outliers', author: 'Malcolm Gladwell', price: 8500, synopsis: "A study of what makes successful people successful. Gladwell argues that excellence is not simply a function of individual talent or intelligence but of opportunity, cultural background, timing, and — famously — 10,000 hours of deliberate practice.", authorBio: 'Malcolm Gladwell is a Canadian author and journalist.', reviews: [], coverImageUrl: 'https://i.imgur.com/iDRS6Rj.jpeg', publicationDate: '2008-11-18', pageCount: 309, category: 'BIOGRAPHIES' },
    { id: 163, title: 'Churchill', author: 'Andrew Roberts', price: 11000, synopsis: "Drawing on previously unseen diaries, letters, and documents from 41 archives, Roberts presents a comprehensive biography of Winston Churchill. He portrays a leader of extraordinary courage and complexity — flawed, determined, and utterly indispensable at the moment history required him.", authorBio: 'Andrew Roberts is a British historian.', reviews: [], coverImageUrl: 'https://i.imgur.com/MLXasbS.jpeg', publicationDate: '2018-10-09', pageCount: 982, category: 'BIOGRAPHIES' },
    { id: 164, title: 'Pele: The Autobiography', author: 'Pele', price: 11000, synopsis: "The autobiography of Edson Arantes do Nascimento — Pele — widely regarded as the greatest footballer of all time. From humble origins in Bauru, Brazil, to three World Cup victories and global stardom, Pele tells the story of a life defined by talent, sacrifice, and an unshakeable love of football.", authorBio: 'Pele was a Brazilian professional footballer.', reviews: [], coverImageUrl: 'https://i.imgur.com/1BiS425.jpeg', publicationDate: '2006', pageCount: 344, category: 'BIOGRAPHIES' },
    { id: 165, title: 'Letters from a Stoic (Seneca)', author: 'Seneca', price: 7000, synopsis: "A selection of letters written by the Roman Stoic philosopher Seneca to his friend Lucilius during the last years of his life. The letters address fundamental questions about life, death, friendship, poverty, and how to live well — making them among the most personal and human of all ancient philosophical texts.", authorBio: 'Seneca was a Roman Stoic philosopher.', reviews: [], coverImageUrl: 'https://i.imgur.com/dyVGcHv.jpeg', publicationDate: 'c. 65 AD', pageCount: 256, category: 'BIOGRAPHIES' },
    { id: 166, title: 'Margaret Thatcher: The Iron Lady', author: 'John Campbell', price: 10000, synopsis: "The definitive two-volume biography of Britain's first and only female Prime Minister, condensed into one volume. Campbell examines Thatcher's rise from grocer's daughter to the most powerful politician in Britain, her decade of radical governance, and her divisive legacy.", authorBio: 'John Campbell is a British historian.', reviews: [], coverImageUrl: 'https://i.imgur.com/MYQ5f0z.jpeg', publicationDate: '2009', pageCount: 576, category: 'BIOGRAPHIES' },
    { id: 167, title: 'Gifted Hands', author: 'Ben Carson', price: 6000, synopsis: "The autobiography of Dr. Ben Carson — one of the world's leading pediatric neurosurgeons. From growing up in poverty in inner-city Detroit, raised by a determined single mother, to becoming director of pediatric neurosurgery at Johns Hopkins Hospital, Carson's story is one of faith, perseverance, and extraordinary achievement.", authorBio: 'Ben Carson is an American retired neurosurgeon and politician.', reviews: [], coverImageUrl: 'https://i.imgur.com/Pgzx7Cz.jpeg', publicationDate: '1990', pageCount: 224, category: 'BIOGRAPHIES' },
    { id: 168, title: 'Trump: The Art of the Deal', author: 'Donald Trump & Tony Schwartz', price: 7500, synopsis: "Part memoir, part business philosophy, Trump recounts major deals from his career in real estate and entertainment, outlining the principles he claims have guided his success: think big, protect the downside, maximise your options, know your market, and use leverage.", authorBio: 'Donald Trump & Tony Schwartz', reviews: [], coverImageUrl: 'https://i.imgur.com/JNvmm20.jpeg', publicationDate: '1987-11-01', pageCount: 246, category: 'BIOGRAPHIES' },
    { id: 169, title: 'Gandhi: An Autobiography', author: 'Mahatma Gandhi', price: 8000, synopsis: "Gandhi's own account of his experiments with truth — from his childhood in Gujarat and his years as a lawyer in South Africa to his emergence as the leader of India's independence movement. A candid, searching self-examination that doubles as one of the great political memoirs of the 20th century.", authorBio: 'Mahatma Gandhi', reviews: [], coverImageUrl: 'https://i.imgur.com/Kc8tJgl.jpeg', publicationDate: '1940', pageCount: 528, category: 'BIOGRAPHIES' },
    { id: 170, title: 'Shoe Dog', author: 'Phil Knight', price: 8500, synopsis: "The memoir of Phil Knight, the co-founder of Nike. From his $50 loan from his father in 1962 through years of near-bankruptcy, legal battles, and creative struggle, Knight tells the story of building one of the world's most recognisable brands with unusual candour and literary grace.", authorBio: 'Phil Knight is the co-founder of Nike.', reviews: [], coverImageUrl: 'https://i.imgur.com/0JXzXYH.jpeg', publicationDate: '2016-04-26', pageCount: 386, category: 'BIOGRAPHIES' },
    { id: 171, title: 'Man\'s Search for Meaning', author: 'Viktor E. Frankl', price: 7000, synopsis: "A powerful memoir of Holocaust survival combined with psychological insight. Viktor Frankl describes his experiences in Nazi concentration camps and develops logotherapy, a psychological approach centered on finding meaning in life even under extreme suffering.", authorBio: 'Viktor E. Frankl was an Austrian psychiatrist and psychotherapist.', reviews: [], coverImageUrl: 'https://i.imgur.com/U2LtcO4.jpeg', publicationDate: '1959', pageCount: 200, category: 'BIOGRAPHIES' },
    { id: 172, title: 'Atomic Habits', author: 'James Clear', price: 8000, synopsis: "A practical guide to building good habits and breaking bad ones. Clear introduces the concept of 'atomic habits' — tiny 1% improvements that compound over time into remarkable results. Using a four-step framework (cue, craving, response, reward), he shows that the problem is never the person but the system. You don't rise to your goals; you fall to your systems.", authorBio: 'James Clear is an author and speaker.', reviews: [], coverImageUrl: 'https://i.imgur.com/N4VV8u1.jpeg', publicationDate: '2018-10-16', pageCount: 320, category: 'PRODUCTIVITY' },
    { id: 173, title: 'Eat That Frog!', author: 'Brian Tracy', price: 6500, synopsis: "Based on the Mark Twain quote that if you eat a live frog first thing in the morning, nothing worse will happen to you all day, Tracy presents 21 techniques to stop procrastinating and get more done in less time. The 'frog' is your most important, most challenging task — the one you're most likely to avoid.", authorBio: 'Brian Tracy is a motivational speaker and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/odih83L.jpeg', publicationDate: '2001-01-01', pageCount: 128, category: 'PRODUCTIVITY' },
    { id: 174, title: 'The One Minute Manager', author: 'Ken Blanchard & Spencer Johnson', price: 6500, synopsis: "A deceptively simple parable about a young man searching for an effective manager. He eventually finds one who uses three management secrets: one-minute goals, one-minute praisings, and one-minute reprimands. The book launched one of the most influential approaches to management in the 20th century.", authorBio: 'Ken Blanchard & Spencer Johnson are authors.', reviews: [], coverImageUrl: 'https://i.imgur.com/Ebdl67G.jpeg', publicationDate: '1982', pageCount: 112, category: 'PRODUCTIVITY' },
    { id: 175, title: 'The 7 Habits of Highly Effective People', author: 'Stephen R. Covey', price: 7500, synopsis: "One of the most influential business books ever written. Covey presents seven habits that align character and competence: be proactive; begin with the end in mind; put first things first; think win-win; seek first to understand; synergise; and sharpen the saw.", authorBio: 'Stephen R. Covey was an educator and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/JwTajMO.jpeg', publicationDate: '1989-08-15', pageCount: 381, category: 'PRODUCTIVITY' },
    { id: 176, title: 'The 80/20 Principle', author: 'Richard Koch', price: 6500, synopsis: "Based on the Pareto Principle — 80% of results come from 20% of causes — Koch shows how this insight can be applied to every aspect of business and life. By identifying the 20% of activities that produce 80% of value, you can work less, earn more, and achieve more.", authorBio: 'Richard Koch is an author and consultant.', reviews: [], coverImageUrl: 'https://i.imgur.com/xs7Z5mv.jpeg', publicationDate: '1997', pageCount: 288, category: 'PRODUCTIVITY' },
    { id: 177, title: 'The 10X Rule', author: 'Grant Cardone', price: 7500, synopsis: "Cardone's argument that the single biggest mistake most people make is setting goals and targets that are too low. The 10X Rule states that you should set targets 10 times higher than you think you need and take 10 times more action than you think necessary.", authorBio: 'Grant Cardone is a motivational speaker and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/3ilLfDC.jpeg', publicationDate: '2011-04-26', pageCount: 240, category: 'PRODUCTIVITY' },
    { id: 178, title: 'The 5AM Club', author: 'Robin Sharma', price: 8500, synopsis: "A story about two strangers who meet a quirky billionaire who teaches them the 20/20/20 formula: spend the first 20 minutes of the morning exercising, the next 20 reflecting and planning, and the last 20 learning. Sharma argues that owning your morning is the foundation of an extraordinary life.", authorBio: 'Robin Sharma is an author and leadership expert.', reviews: [], coverImageUrl: 'https://i.imgur.com/NfAJ4em.jpeg', publicationDate: '2018-12-04', pageCount: 352, category: 'PRODUCTIVITY' },
    { id: 179, title: 'Clear Thinking', author: 'Shane Parrish', price: 8500, synopsis: "A framework for making better decisions in the moments that matter most. Parrish argues that most bad outcomes result not from insufficient information but from failing to think clearly in high-stakes situations. He presents four key defaults that undermine clear thinking and the principles that overcome them.", authorBio: 'Shane Parrish is an entrepreneur and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/zJj8o9r.jpeg', publicationDate: '2023-10-03', pageCount: 272, category: 'PRODUCTIVITY' },
    { id: 180, title: 'So Good They Can\'t Ignore You', author: 'Cal Newport', price: 8500, synopsis: "A challenge to the conventional wisdom of 'follow your passion.' Newport argues that passion is the result of mastery, not its prerequisite — and that the path to a fulfilling career lies in developing rare and valuable skills (career capital) and then using them to build work that matters to you.", authorBio: 'Cal Newport is a computer science professor and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/t4npeU3.jpeg', publicationDate: '2012-09-18', pageCount: 304, category: 'PRODUCTIVITY' },
    { id: 181, title: 'Deep Work', author: 'Cal Newport', price: 10000, synopsis: "The ability to focus without distraction on cognitively demanding tasks is becoming increasingly rare — and increasingly valuable. Newport argues that deep work is the superpower of the 21st century economy and provides practical rules for transforming your work habits to produce more in less time.", authorBio: 'Cal Newport is a computer science professor and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/oWQzLLp.jpeg', publicationDate: '2016-01-05', pageCount: 296, category: 'PRODUCTIVITY' },
    { id: 182, title: 'Hyperfocus', author: 'Chris Bailey', price: 7500, synopsis: "A counterintuitive guide to productivity that argues we need two modes of thinking: hyperfocus and scatterfocus (deliberately letting the mind wander to enable creativity and problem-solving). Bailey shows how to toggle between these modes to become exponentially more effective.", authorBio: 'Chris Bailey is a productivity expert.', reviews: [], coverImageUrl: 'https://i.imgur.com/IvxIx6w.jpeg', publicationDate: '2018-09-04', pageCount: 256, category: 'PRODUCTIVITY' },
    { id: 183, title: 'Dopamine Detox', author: 'Thibaut Meurisse', price: 6500, synopsis: "A guide to reclaiming control of your attention in an age of addictive technology. Meurisse explains how constant stimulation from social media, entertainment, and notifications depletes motivation and focus, and provides a practical protocol for resetting your dopamine system to restore drive and clarity.", authorBio: 'Thibaut Meurisse is an author.', reviews: [], coverImageUrl: 'https://i.imgur.com/uiUhNhP.jpeg', publicationDate: '2020', pageCount: 132, category: 'PRODUCTIVITY' },
    { id: 184, title: 'The Art of Laziness', author: 'Library Mindset', price: 5500, synopsis: "A modern productivity guide that challenges traditional ideas of hustle culture. It focuses on overcoming procrastination, building efficient habits, and achieving goals with less stress by working smarter rather than harder.", authorBio: 'Library Mindset', reviews: [], coverImageUrl: 'https://i.imgur.com/Q0qZN5H.jpeg', publicationDate: '2021', pageCount: 170, category: 'PRODUCTIVITY' },
    { id: 185, title: 'Don\'t Leave Anything for Later', author: 'Library Mindset', price: 5500, synopsis: "A motivational productivity-focused book aimed at helping readers eliminate procrastination and take immediate action toward their goals. It emphasizes discipline, urgency, and breaking the habit of delaying important tasks.", authorBio: 'Library Mindset', reviews: [], coverImageUrl: 'https://i.imgur.com/oEVfB1A.jpeg', publicationDate: '2025', pageCount: 150, category: 'PRODUCTIVITY' },
    { id: 186, title: 'How to Finish Everything You Start', author: 'Jan Yager', price: 7000, synopsis: "A productivity guide that explains why people struggle to complete tasks and offers practical methods to improve focus, avoid procrastination, and finish what they begin. It introduces a structured approach to help readers prioritize better and follow through consistently.", authorBio: 'Jan Yager is an author.', reviews: [], coverImageUrl: 'https://i.imgur.com/VaV0Oup.jpeg', publicationDate: '2019', pageCount: 240, category: 'PRODUCTIVITY' },
    { id: 187, title: 'The Mafia Manager', author: 'V.', price: 5500, synopsis: "A management manual disguised as a study of how the Mafia operates. Using the structure and methods of organised crime as a metaphor, the anonymous author (V.) provides ruthlessly practical guidance on leadership, loyalty, handling competition, managing people, and building organisations that endure. Compared widely to Machiavelli's The Prince.", authorBio: 'Anonymous', reviews: [], coverImageUrl: 'https://i.imgur.com/8T5YFQg.jpeg', publicationDate: '1996', pageCount: 192, category: 'NEGOTIATIONS' },
    { id: 188, title: 'The Way of the Superior Man', author: 'David Deida', price: 7000, synopsis: "A guide to masculine spirituality and authentic living for men. Deida challenges men to stop waiting for permission to live fully — to face their deepest fears, speak their deepest truths, and love without compromise. The book explores work, relationships, sexuality, and purpose through the lens of masculine development.", authorBio: 'David Deida is an author.', reviews: [], coverImageUrl: 'https://i.imgur.com/YzuqOKS.jpeg', publicationDate: '2004', pageCount: 200, category: 'LEADERSHIP' },
    { id: 189, title: 'The Prince', author: 'Niccolo Machiavelli', price: 6500, synopsis: "Written in 1513 and published posthumously in 1532, The Prince is a political treatise that examines how rulers acquire and maintain power. Machiavelli dispensed with idealism in favour of political realism — arguing that effective leadership sometimes requires deception, force, and the appearance of virtue over its reality.", authorBio: 'Niccolo Machiavelli was an Italian diplomat and political theorist.', reviews: [], coverImageUrl: 'https://i.imgur.com/CEaOrjA.jpeg', publicationDate: '1532', pageCount: 140, category: 'LEADERSHIP' },
    { id: 190, title: 'The One Minute Manager', author: 'Ken Blanchard & Spencer Johnson', price: 6500, synopsis: "A deceptively simple parable about a young man searching for an effective manager. He eventually finds one who uses three management secrets: one-minute goals, one-minute praisings, and one-minute reprimands. The book launched one of the most influential approaches to management in the 20th century.", authorBio: 'Ken Blanchard & Spencer Johnson', reviews: [], coverImageUrl: 'https://i.imgur.com/Ebdl67G.jpeg', publicationDate: '1982', pageCount: 112, category: 'LEADERSHIP' },
    { id: 191, title: 'Right Thing, Right Now', author: 'Ryan Holiday', price: 7500, synopsis: "The third volume in Holiday's Stoic Virtues trilogy, exploring the virtue of justice. Drawing on the lives of Marcus Aurelius, Cato, and other Stoic figures, Holiday argues that doing the right thing — consistently, courageously, and without compromise — is not just an ethical imperative but the only path to genuine success and inner peace.", authorBio: 'Ryan Holiday is an American author and media strategist.', reviews: [], coverImageUrl: 'https://i.imgur.com/fGPRlJS.jpeg', publicationDate: '2024-05-14', pageCount: 304, category: 'LEADERSHIP' },
    { id: 192, title: 'The Next Conversation', author: 'Jefferson Fisher', price: 8000, synopsis: "A trial lawyer's guide to having the conversations that matter most — without conflict, defensiveness, or regret. Fisher teaches readers how to argue less, say more, and turn difficult conversations into opportunities for genuine connection and resolution.", authorBio: 'Jefferson Fisher is a lawyer and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/uRRyXSk.jpeg', publicationDate: '2025-04-01', pageCount: 256, category: 'NEGOTIATIONS' },
    { id: 193, title: 'The Laws of Human Nature', author: 'Robert Greene', price: 12500, synopsis: "A deep exploration of the forces that drive human behaviour. Greene examines 18 fundamental laws of human nature — from irrationality and narcissism to envy, grandiosity, and the compulsive nature of people's character — and shows how understanding these forces gives you power over yourself and others.", authorBio: 'Robert Greene is an American author.', reviews: [], coverImageUrl: 'https://i.imgur.com/3JURrGh.jpeg', publicationDate: '2018-10-23', pageCount: 624, category: 'LEADERSHIP' },
    { id: 194, title: 'The 7 Habits of Highly Effective People', author: 'Stephen R. Covey', price: 7500, synopsis: "One of the most influential business books ever written. Covey presents seven habits that align character and competence: be proactive; begin with the end in mind; put first things first; think win-win; seek first to understand; synergise; and sharpen the saw.", authorBio: 'Stephen R. Covey was an educator and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/JwTajMO.jpeg', publicationDate: '1989-08-15', pageCount: 381, category: 'LEADERSHIP' },
    { id: 195, title: 'The 48 Laws of Power', author: 'Robert Greene', price: 8000, synopsis: "A ruthlessly practical manual of power drawn from the lives of historical figures — from Machiavelli and Sun Tzu to Queen Elizabeth I and Henry Kissinger. Greene distils 48 laws that govern how power is acquired, maintained, and lost. Both a guide and a warning: know these laws to use them and defend against those who do.", authorBio: 'Robert Greene is an American author.', reviews: [], coverImageUrl: 'https://i.imgur.com/j93FKvo.jpeg', publicationDate: '1998-09-01', pageCount: 452, category: 'NEGOTIATIONS' },
    { id: 196, title: 'The Art of War', author: 'Sun Tzu', price: 7500, synopsis: "An ancient Chinese military treatise attributed to Sun Tzu, a military general from the 5th century BC. Composed of 13 chapters, each addressing a different aspect of warfare, it remains the most influential strategy text ever written — applied today to business, law, politics, and competitive strategy.", authorBio: 'Sun Tzu was a Chinese general and military strategist.', reviews: [], coverImageUrl: 'https://i.imgur.com/JWnMVZK.jpeg', publicationDate: 'c. 500 BC', pageCount: 68, category: 'LEADERSHIP' },
    { id: 197, title: 'How to Talk to Anyone', author: 'Larry King', price: 7000, synopsis: "Ninety-two little tricks for big success in relationships. Lowndes provides specific, immediately applicable techniques for making a great first impression, mastering small talk, exuding confidence, and building rapport with anyone in any situation — from casual social events to high-stakes professional encounters.", authorBio: 'Larry King', reviews: [], coverImageUrl: 'https://i.imgur.com/iosCVcu.jpeg', publicationDate: '1999', pageCount: 304, category: 'NEGOTIATIONS' },
    { id: 198, title: 'Good Strategy / Bad Strategy', author: 'Richard Rumelt', price: 8500, synopsis: "A rigorous examination of what real strategy is — and what it isn't. Rumelt argues that most so-called strategies are actually goals, visions, or wishes dressed up in strategic language. Good strategy has a kernel: a diagnosis, a guiding policy, and coherent actions. Bad strategy is vague, wishful thinking with no real edge.", authorBio: 'Richard Rumelt is an American academic.', reviews: [], coverImageUrl: 'https://i.imgur.com/w9470C1.jpeg', publicationDate: '2011-07-19', pageCount: 336, category: 'LEADERSHIP' },
    { id: 199, title: 'Think Faster, Talk Smarter', author: 'Matt Abrahams', price: 8000, synopsis: "A Stanford professor's guide to communicating confidently and effectively in spontaneous situations — from Q&A sessions and job interviews to toasts and difficult conversations. Abrahams presents six strategies for managing anxiety, structuring responses, and delivering ideas clearly when there is no time to prepare.", authorBio: 'Matt Abrahams is a lecturer.', reviews: [], coverImageUrl: 'https://i.imgur.com/LvD5lJA.jpeg', publicationDate: '2023-09-12', pageCount: 272, category: 'NEGOTIATIONS' },
    { id: 201, title: 'Win Every Argument', author: 'Mehdi Hasan', price: 6500, synopsis: "A practical guide to persuasion, debate, and clear thinking. Drawing from real-world experience, Hasan shows how to build strong arguments, challenge ideas effectively, and communicate with confidence in everyday conversations.", authorBio: 'Mehdi Hasan', reviews: [], coverImageUrl: 'https://i.imgur.com/hWRopSc.jpeg', publicationDate: '2023', pageCount: 336, category: 'NEGOTIATIONS' },
    { id: 202, title: 'Influence', author: 'Robert B. Cialdini', price: 12500, synopsis: "A seminal examination of the six universal principles of persuasion: reciprocity, commitment and consistency, social proof, authority, liking, and scarcity. Cialdini spent years studying compliance professionals — salespeople, advertisers, fundraisers — to understand why people say yes and how this knowledge can be used and defended against.", authorBio: 'Robert B. Cialdini is an American psychologist.', reviews: [], coverImageUrl: 'https://i.imgur.com/YOLKaCd.jpeg', publicationDate: '2021', pageCount: 336, category: 'NEGOTIATIONS' },
    { id: 203, title: 'The Communication Book', author: 'Mikael Krogerus & Roman Tschappeler', price: 10000, synopsis: "Tested 44 communication theories that help people exchange information compassionately and effectively, especially in their daily business life. The book provides a guide that transforms how we speak and listen, enabling deeper connection and the peaceful resolution of conflict.", authorBio: 'Mikael Krogerus & Roman Tschappeler', reviews: [], coverImageUrl: 'https://i.imgur.com/6dZhIlb.jpeg', publicationDate: '2020', pageCount: 208, category: 'NEGOTIATIONS' },
    { id: 205, title: 'Never Split the Difference', author: 'Chris Voss (with Tahl Raz)', price: 8500, synopsis: "A negotiation guide based on real FBI hostage negotiation tactics. It teaches psychological techniques for persuasion, emotional intelligence, and communication strategies that help achieve better outcomes in business and everyday life.", authorBio: 'Chris Voss is a consultant and author.', reviews: [], coverImageUrl: 'https://i.imgur.com/hlGfh7s.jpeg', publicationDate: '2016', pageCount: 288, category: 'NEGOTIATIONS' }
  ]);
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
    setIsAuthLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Password reset email sent. Please check your inbox.');
      setIsForgotPassword(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      handleError(err, 'Password reset');
    } finally {
      setIsAuthLoading(false);
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

  const finishCheckout = async () => {
    if (!user) return;
    const newOrderData = {
      date: new Date().toLocaleDateString(),
      totalPrice: totalPrice,
      items: [...cart],
      createdAt: Timestamp.now(),
    };
    try {
      const ordersRef = collection(db, 'users', user.uid, 'orders');
      const docRef = await addDoc(ordersRef, newOrderData);
      const newOrder: Order = {
        id: docRef.id,
        ...newOrderData
      };
      setOrders(prev => [...prev, newOrder]);
      setIsCheckoutOpen(false); 
      setConfirmedOrder(newOrder);
      setCart([]);
    } catch (e) {
      handleError(e, 'Saving order');
    }
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
             {user && (
               <button onClick={() => { setActiveView('orders'); setIsMobileMenuOpen(false); }} className="text-right py-2 font-semibold text-white text-[11px]">Orders</button>
             )}
             {user ? (
               <button onClick={() => { signOut(auth); setIsMobileMenuOpen(false); }} className="text-right py-2 font-semibold text-white text-[11px]">Logout</button>
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
            {isLoadingOrders ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : orders.length === 0 ? (
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
                <div className="bg-stone-50 p-4 rounded-xl text-sm">
                  <h4 className="font-semibold mb-2">Order Summary</h4>
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.title} x {item.quantity}</span>
                      <span>₦{item.price * item.quantity}</span>
                    </div>
                  ))}
                  <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span>₦{cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}</span>
                  </div>
                </div>
                <label className="flex items-center gap-3 p-4 border rounded-xl">
                  <input type="radio" name="payment" value="card" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} /> Credit Card
                </label>
                <label className="flex items-center gap-3 p-4 border rounded-xl">
                  <input type="radio" name="payment" value="transfer" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} /> Bank Transfer
                </label>
                <button 
                  onClick={() => {
                    if (paymentMethod !== 'card' && paymentMethod !== 'transfer') {
                      setPaymentError('Please select a payment method.');
                      return;
                    }
                    setCheckoutStep(3);
                  }} 
                  className="w-full bg-stone-900 text-white py-4 rounded-xl font-semibold hover:bg-stone-800 disabled:opacity-50"
                >
                  Confirm Details
                </button>
              </div>
            )}

            {checkoutStep === 3 && (
              <div className="space-y-6 text-black">
                <h3 className="text-xl font-bold">Review Order</h3>
                <div className="bg-stone-50 p-4 rounded-xl text-sm">
                  <h4 className="font-semibold mb-2">Order Summary</h4>
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.title} x {item.quantity}</span>
                      <span>₦{item.price * item.quantity}</span>
                    </div>
                  ))}
                  <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span>₦{cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}</span>
                  </div>
                </div>
                
                <div className="bg-stone-50 p-4 rounded-xl text-sm">
                  <h4 className="font-semibold mb-2">Payment Method</h4>
                  <p>{paymentMethod === 'card' ? 'Credit Card' : 'Bank Transfer'}</p>
                </div>

                {paymentError && <p className="text-red-500 text-sm">{paymentError}</p>}

                <div className="flex gap-4">
                  <button onClick={() => setCheckoutStep(2)} className="flex-1 bg-stone-100 text-stone-900 py-4 rounded-xl font-semibold hover:bg-stone-200">
                    Back
                  </button>
                  <button 
                    disabled={isProcessingPayment}
                    onClick={async () => {
                      setPaymentError(null);
                      setIsProcessingPayment(true);
                      try {
                        console.log('Sending request to /api/initialize-payment');
                        const fullUrl = '/api/initialize-payment';
                        console.log('Fetching:', fullUrl);
                        const response = await fetch(fullUrl, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            email: user?.email || 'customer@example.com', 
                            amount: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
                            metadata: { 
                              orderId: 'temp_order_id', 
                              shippingName: shippingInfo.name,
                              shippingAddress: shippingInfo.address,
                              shippingCity: shippingInfo.city,
                              method: paymentMethod 
                            }
                          })
                        });

                        const text = await response.text();
                        console.log('Raw response text:', text);
                        
                        let data;
                        try {
                            data = JSON.parse(text);
                        } catch (e) {
                            throw new Error('Server returned invalid JSON: ' + text);
                        }
                        
                        if (!response.ok) {
                            throw new Error(data.error || data.details || 'Payment failed');
                        }

                        if (data.status && data.data.authorization_url) {
                          setPaymentReference(data.data.reference);
                          window.location.href = data.data.authorization_url;
                        } else {
                          throw new Error('Payment initialization failed. Please verify your details or try a different payment method.');
                        }
                      } catch (err) {
                        const errorMessage = err instanceof Error ? err.message : String(err);
                        setPaymentError('A network error occurred: ' + errorMessage + '. Please check your connection.');
                        handleError(err, 'Payment initialization');
                      } finally {
                        setIsProcessingPayment(false);
                      }
                    }}
                    className="flex-1 bg-golden-brown-700 text-white py-4 rounded-xl font-semibold hover:bg-golden-brown-800 disabled:opacity-50"
                  >
                    {isProcessingPayment ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> Confirm & Pay
                      </span>
                    ) : (
                      'Confirm & Pay'
                    )}
                  </button>
                </div>
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
