import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import ShoppingCart from './ShoppingCart.tsx'
import ProductDetails from './ProductDetails.tsx'
import './index.css'
import { CartProvider } from './context/CartContext'
import { WalletProvider } from './context/WalletContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/cart" element={<ShoppingCart />} />
            <Route path="/product/:id" element={<ProductDetails />} />
          </Routes>
        </CartProvider>
      </WalletProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
