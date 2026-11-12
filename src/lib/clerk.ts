/** Clerk only turns on when a publishable key is set. Without one, ClubOS runs as a demo with a role switcher. */
export const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
