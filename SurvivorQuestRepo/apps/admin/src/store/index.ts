import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@/shared/api/base-api';

export const store = configureStore({
    reducer: {
        [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(baseApi.middleware),
    // RTK batches subscriber notifications for RTK Query's own actions. Its
    // default strategy waits for requestAnimationFrame — and a browser stops
    // producing frames in a hidden tab, so a panel left in a background tab
    // (an operator watching a live realization, then switching tabs) stops
    // updating entirely: the data lands in the store, the notification waits
    // for a frame that never comes, and the screen keeps its last render.
    //
    // A short timer batches just as effectively for the burst sizes here and
    // keeps firing while the tab is hidden.
    enhancers: (getDefaultEnhancers) =>
        getDefaultEnhancers({ autoBatch: { type: 'timer', timeout: 10 } }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;