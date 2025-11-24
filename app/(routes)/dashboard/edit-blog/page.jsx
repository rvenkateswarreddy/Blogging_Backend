import { Suspense } from "react";
import EditBlog from "./EditBlog"


export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
    <EditBlog/>
    </Suspense>
  );
}