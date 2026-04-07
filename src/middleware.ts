import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/compose(.*)",
  "/pricing(.*)",
  "/history(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jinja2|jinja|txt|xml|map|ttf|woff2?|ico|gif|png|jpg|jpeg|webp|svg|avif)).*)",
    "/(api|trpc)(.*)",
  ],
};
