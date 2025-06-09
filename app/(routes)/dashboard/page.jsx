import React from "react";

const page = () => {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-fuchsia-100 via-cyan-100 to-blue-200 text-black">
      <main className="flex-1 p-6 ">
        <h2 className="text-xl font-semibold mb-4">
          Welcome to your dashboard!
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow">📊 Stats Widget</div>
          <div className="bg-white p-4 rounded shadow">📅 Calendar</div>
          <div className="bg-white p-4 rounded shadow">📋 Tasks</div>
        </div>
      </main>
    </div>
  );
};

export default page;
