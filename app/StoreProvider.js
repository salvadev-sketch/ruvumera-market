'use client'
import { useEffect, useRef } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '../lib/store'
import { fetchProducts } from '../lib/features/product/productSlice'

export default function StoreProvider({ children }) {
  const storeRef = useRef(undefined)
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore()
  }

  useEffect(() => {
    // Load real products from the database on first mount.
    storeRef.current.dispatch(fetchProducts())
  }, [])

  return <Provider store={storeRef.current}>{children}</Provider>
}
