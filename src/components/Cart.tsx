import { X, Minus, Plus, Trash2 } from 'lucide-react';

type CartItem = any; // Simplify for now

export default function Cart({ isOpen, onClose, cart, updateQuantity, removeItem, totalPrice, startCheckout }: { isOpen: boolean, onClose: () => void, cart: any[], updateQuantity: (id: number, delta: number) => void, removeItem: (id: number) => void, totalPrice: number, startCheckout: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full p-4 sm:p-6 flex flex-col text-black">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Your Cart</h2>
          <X className="cursor-pointer" onClick={onClose} />
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
  );
}
