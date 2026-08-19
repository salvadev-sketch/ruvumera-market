'use client'
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import Loading from "@/components/Loading"

export default function ManageProduct() {

    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/store/product')
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Failed to load products")
            }

            setProducts(data.products)
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const toggleStock = async (productId) => {
        const res = await fetch('/api/store/product/toggle-stock', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId })
        })
        const data = await res.json()

        if (!res.ok) {
            throw new Error(data.error || "Failed to update stock status")
        }

        setProducts(prev => prev.map(p => p.id === productId ? data.product : p))
    }

    useEffect(() => {
        fetchProducts()
    }, [])

    if (loading) return <Loading />

    return (
        <div className="mx-6 min-h-[70vh] my-16">
            <h1 className="text-3xl mb-6">Manage <span className="text-slate-800 font-medium">Products</span></h1>

            {products.length === 0 ? (
                <p className="text-slate-500">You haven't added any products yet.</p>
            ) : (
                <div className="flex flex-col gap-3 max-w-3xl">
                    {products.map(product => (
                        <div key={product.id} className="flex items-center gap-4 border border-slate-200 rounded p-3">
                            <img src={product.images?.[0]} alt={product.name} className="w-16 h-16 object-cover rounded border border-slate-100" />
                            <div className="flex-1">
                                <p className="text-slate-800 font-medium">{product.name}</p>
                                <p className="text-slate-500 text-sm">{product.category} · ${product.price}</p>
                            </div>
                            <button
                                onClick={() => toast.promise(toggleStock(product.id), { loading: "Updating...", success: "Updated!", error: (err) => err.message })}
                                className={`px-4 py-1.5 rounded text-sm transition ${product.inStock ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
                            >
                                {product.inStock ? "In Stock" : "Out of Stock"}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
