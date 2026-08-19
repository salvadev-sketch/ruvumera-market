'use client'
import { useState } from "react"
import toast from "react-hot-toast"

const CATEGORIES = ["Watch", "Earbuds", "Mouse", "Decoration", "Headphones", "Speakers"]

export default function AddProduct() {

    const [form, setForm] = useState({
        name: "",
        description: "",
        mrp: "",
        price: "",
        category: CATEGORIES[0],
    })
    const [imageFiles, setImageFiles] = useState([])
    const [imagePreviews, setImagePreviews] = useState([])
    const [uploading, setUploading] = useState(false)

    const onChangeHandler = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const onImagesChange = (e) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return
        setImageFiles(files)
        setImagePreviews(files.map(f => URL.createObjectURL(f)))
    }

    const uploadImages = async () => {
        const urls = []
        for (const file of imageFiles) {
            const formData = new FormData()
            formData.append("file", file)

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || `Failed to upload ${file.name}`)
            }
            urls.push(data.url)
        }
        return urls
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()

        if (imageFiles.length === 0) {
            throw new Error("Please add at least one product image")
        }

        setUploading(true)
        try {
            const images = await uploadImages()

            const res = await fetch('/api/store/product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, images })
            })
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Failed to add product")
            }

            setForm({ name: "", description: "", mrp: "", price: "", category: CATEGORIES[0] })
            setImageFiles([])
            setImagePreviews([])
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="mx-6 min-h-[70vh] my-16">
            <form
                onSubmit={e => toast.promise(onSubmitHandler(e), { loading: "Adding product...", success: "Product added!", error: (err) => err.message })}
                className="max-w-lg flex flex-col gap-3 text-slate-500"
            >
                <h1 className="text-3xl">Add <span className="text-slate-800 font-medium">Product</span></h1>

                <p>Product Images</p>
                <input onChange={onImagesChange} type="file" accept="image/*" multiple required className="border border-slate-300 outline-slate-400 w-full p-2 rounded" />
                {imagePreviews.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                        {imagePreviews.map((src, i) => (
                            <img key={i} src={src} alt={`Preview ${i + 1}`} className="w-20 h-20 object-cover rounded border border-slate-200" />
                        ))}
                    </div>
                )}
                <p className="text-xs text-slate-400 -mt-2">You can select multiple images. JPG, PNG or similar, up to 5MB each.</p>

                <p>Name</p>
                <input name="name" onChange={onChangeHandler} value={form.name} type="text" placeholder="Enter product name" required className="border border-slate-300 outline-slate-400 w-full p-2 rounded" />

                <p>Description</p>
                <textarea name="description" onChange={onChangeHandler} value={form.description} rows={4} placeholder="Enter product description" required className="border border-slate-300 outline-slate-400 w-full p-2 rounded resize-none" />

                <div className="flex gap-3">
                    <div className="flex-1">
                        <p>Actual Price (MRP)</p>
                        <input name="mrp" onChange={onChangeHandler} value={form.mrp} type="number" min="0" step="0.01" placeholder="0.00" required className="border border-slate-300 outline-slate-400 w-full p-2 rounded" />
                    </div>
                    <div className="flex-1">
                        <p>Offer Price</p>
                        <input name="price" onChange={onChangeHandler} value={form.price} type="number" min="0" step="0.01" placeholder="0.00" required className="border border-slate-300 outline-slate-400 w-full p-2 rounded" />
                    </div>
                </div>

                <p>Category</p>
                <select name="category" onChange={onChangeHandler} value={form.category} className="border border-slate-300 outline-slate-400 w-full p-2 rounded">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <button disabled={uploading} className="bg-slate-800 text-white px-12 py-2 rounded mt-6 mb-20 active:scale-95 hover:bg-slate-900 transition disabled:opacity-60">
                    {uploading ? "Uploading..." : "Add Product"}
                </button>
            </form>
        </div>
    )
}
