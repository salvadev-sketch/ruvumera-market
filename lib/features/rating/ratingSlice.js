import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

// Fetches the current user's own ratings from the database via /api/rating.
export const fetchRatings = createAsyncThunk(
    'rating/fetchRatings',
    async () => {
        const res = await fetch('/api/rating')
        if (!res.ok) {
            throw new Error('Failed to fetch ratings')
        }
        const data = await res.json()
        return data.ratings
    }
)

const ratingSlice = createSlice({
    name: 'rating',
    initialState: {
        ratings: [],
    },
    reducers: {
        addRating: (state, action) => {
            const existingIndex = state.ratings.findIndex(
                r => r.orderId === action.payload.orderId && r.productId === action.payload.productId
            )
            if (existingIndex >= 0) {
                state.ratings[existingIndex] = action.payload
            } else {
                state.ratings.push(action.payload)
            }
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchRatings.fulfilled, (state, action) => {
            state.ratings = action.payload
        })
    }
})

export const { addRating } = ratingSlice.actions

export default ratingSlice.reducer
