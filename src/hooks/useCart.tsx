import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { setTokenSourceMapRange } from 'typescript';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const [productResponse, stockResponse] = await Promise.all([
        api.get(`products/${productId}`),
        api.get(`stock/${productId}`)
      ])

      const product = productResponse.data
      const stock = stockResponse.data

      if (!stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
      }

      let newCart;
      if (cart.find(productCart => productCart.id === productId)) {
        newCart = cart.map(item => {
          if (item.id === productId) {
            item.amount += 1
          }
          return item
        })
      } else {
        const newProduct = { ...product, amount: 1 }
        newCart = [...cart, newProduct]
      }

      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(product => product.id !== productId)

      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return

      const stockResponse = await api.get(`stock/${productId}`)
      const stock = stockResponse.data

      if (amount > stock.amount) {
        return toast.error('Quantidade solicitada fora de estoque');
      }

      const newCart = cart.map(product => {
        if (product.id === productId) {
          product.amount = amount
        }
        return product
      })

      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
