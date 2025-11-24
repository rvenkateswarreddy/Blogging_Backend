import { Suspense } from "react";
import BlogForm from "./BlogForm";


export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <BlogForm />
    </Suspense>
  );
}