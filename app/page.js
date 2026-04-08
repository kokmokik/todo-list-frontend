"use client";

import * as React from "react";
import { motion, AnimatePresence, useAnimate, usePresence } from "framer-motion";
import { Leaf, Plus, Trash2 } from "lucide-react";

function FloatingLeaves() {
  const [leaves, setLeaves] = React.useState([]);

  React.useEffect(() => {
    setLeaves(
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        delay: Math.random() * 5,
        duration: 15 + Math.random() * 10,
        x: Math.random() * 100,
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {leaves.map((leaf) => (
        <motion.div
          key={leaf.id}
          className="absolute text-green-600/10"
          initial={{ y: -50, x: `${leaf.x}%`, rotate: 0 }}
          animate={{
            y: "110vh",
            rotate: 360,
            x: [`${leaf.x}%`, `${leaf.x + 10}%`, `${leaf.x}%`],
          }}
          transition={{
            duration: leaf.duration,
            delay: leaf.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <Leaf className="w-6 h-6" />
        </motion.div>
      ))}
    </div>
  );
}

function Todo({ removeElement, handleCheck, id, children, checked }) {
  const [isPresent, safeToRemove] = usePresence();
  const [scope, animate] = useAnimate();

  React.useEffect(() => {
    if (!isPresent) {
      const exitAnimation = async () => {
        animate(
          "p",
          { color: checked ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)" },
          { ease: "easeIn", duration: 0.125 }
        );
        await animate(
          scope.current,
          { scale: 1.025 },
          { ease: "easeIn", duration: 0.125 }
        );
        await animate(
          scope.current,
          { opacity: 0, x: checked ? 24 : -24 },
          { delay: 0.75 }
        );
        safeToRemove();
      };
      exitAnimation();
    }
  }, [isPresent, checked, animate, scope, safeToRemove]);

  return (
    <motion.div
      ref={scope}
      layout
      className="relative flex w-full items-center gap-3 rounded-xl border border-green-800 bg-green-950/30 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => handleCheck(id)}
        className="size-5 accent-green-600 cursor-pointer"
      />
      <p className={`flex-1 text-green-100 transition-colors ${checked ? "text-green-400 line-through" : ""}`}>
        {children}
      </p>
      <button
        onClick={() => removeElement(id)}
        className="rounded-lg bg-red-900/30 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-900/50"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

function Todos({ todos, handleCheck, removeElement }) {
  return (
    <div className="w-full space-y-3">
      <AnimatePresence>
        {todos.map((t) => (
          <Todo
            key={t.id}
            id={t.id}
            checked={t.completed}
            handleCheck={handleCheck}
            removeElement={removeElement}
          >
            {t.content}
          </Todo>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Form({ onAdd }) {
  const [visible, setVisible] = React.useState(false);
  const [text, setText] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    await onAdd(text.trim());
    setText("");
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 left-1/2 w-full max-w-xl -translate-x-1/2 px-4">
      <AnimatePresence>
        {visible && (
          <motion.form
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 25 }}
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="mb-6 w-full rounded-xl border border-green-800 bg-green-950/90 p-4 shadow-lg backdrop-blur-sm"
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Plant a new task..."
              className="h-24 w-full resize-none rounded-lg bg-green-900/30 p-3 text-sm text-green-100 placeholder-green-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex items-center justify-end mt-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-green-600 px-4 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Planting..." : "Plant"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      <button
        onClick={() => setVisible((pv) => !pv)}
        className="grid w-full place-content-center rounded-full border border-green-800 bg-green-950/90 py-3 text-lg text-green-300 transition-colors hover:bg-green-900/50 shadow-lg"
      >
        <Plus className={`transition-transform ${visible ? "rotate-45" : "rotate-0"}`} />
      </button>
    </div>
  );
}

export default function OrganicTodoList() {
  const [todos, setTodos] = React.useState([]);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    fetch("/api/todos/")
      .then((r) => r.json())
      .then((data) => setTodos(data))
      .catch(() => setError("Failed to load todos. Is the backend running?"));
  }, []);

  const handleAdd = async (text) => {
    try {
      const res = await fetch("/api/todos/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const newTodo = await res.json();
      setTodos((pv) => [newTodo, ...pv]);
    } catch {
      setError("Failed to add todo.");
    }
  };

  const handleCheck = async (id) => {
    const todo = todos.find((t) => t.id === id);
    try {
      const res = await fetch(`/api/todos/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !todo.completed }),
      });
      const updated = await res.json();
      setTodos((pv) => pv.map((t) => (t.id === id ? updated : t)));
    } catch {
      setError("Failed to update todo.");
    }
  };

  const removeElement = async (id) => {
    try {
      await fetch(`/api/todos/${id}/`, { method: "DELETE" });
      setTodos((pv) => pv.filter((t) => t.id !== id));
    } catch {
      setError("Failed to delete todo.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-emerald-950 to-teal-950">
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <FloatingLeaves />

        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, rgba(34, 197, 94, 0.2) 0%, transparent 50%),
                               radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.2) 0%, transparent 50%)`,
            }}
          />
        </div>

        <div className="relative z-10 container mx-auto px-4 md:px-6 pb-32">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <h1
                className="text-6xl sm:text-7xl md:text-8xl font-black mb-4 tracking-tight text-yellow-600"
                style={{ fontFamily: "Impact, sans-serif" }}
              >
                GROW YOUR DAY
              </h1>
            </motion.div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-900/30 p-3 text-center text-sm text-red-400">
                {error}
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="rounded-3xl border border-green-800 bg-green-950/50 p-8 shadow-2xl backdrop-blur-sm"
            >
              <Todos
                todos={todos}
                handleCheck={handleCheck}
                removeElement={removeElement}
              />
            </motion.div>
          </div>
        </div>

        <Form onAdd={handleAdd} />
      </section>
    </div>
  );
}
