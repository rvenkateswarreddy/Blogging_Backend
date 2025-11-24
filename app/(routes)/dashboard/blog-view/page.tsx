import { Suspense } from "react";
import BlogView from "./BlogView";


export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <BlogView />
    </Suspense>
  );
}