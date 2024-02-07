"use client";
import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";

export default function login() {
  // set message
  const [message, setMessage] = useState('');

  // set message after user creation
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);

    let mess = "";
    if (queryParams.get("message") !== null) {
      mess = queryParams.get("message") as string;
    }
    setMessage(mess);
  });

  // submit login form
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/login`,
      {
        method: "POST",
        body: formData,
      }
    );
    if (response.status === 200) {
      window.location.href = "http://localhost/";
    } else {
      const data = await response.json();
      setMessage(data.message);
    }
  }
  return (
    <div>
      <form onSubmit={onSubmit} className="container mx-auto w-screen">
        <div className="flex flex-col m-10 space-y-4">
          <label htmlFor="username">username</label>
          <input
            type="username"
            id="username"
            name="username"
            placeholder="username"
            required
            className="bg-gray-100 p-3 rounded"
          />
          <label htmlFor="password">password</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="password"
            required
            className="bg-gray-100 p-3 rounded"
          />
          <button
            type="submit"
            className="w-40 h-9 rounded bg-pink-400 text-white"
          >
            Login
          </button>
          <div className="text-red-500">{message}</div>
          <div className="text-cyan-400">
            <Link href="signup">Create an account?</Link>
          </div>
          <div className="text-cyan-400">
            <Link href="passwordreset">Forget Password?</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
