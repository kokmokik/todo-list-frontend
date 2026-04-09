"use client";

import * as React from "react";
import { motion, AnimatePresence, useAnimate, usePresence } from "framer-motion";
import { Leaf, Plus, Trash2, Tag } from "lucide-react";

// --- Tag color system ---
const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#3b82f6",
  "#8b5cf6", "#ec4899", "#06b6d4", "#10b981",
  "#f59e0b", "#6366f1",
];

// Normalize whatever the backend sends for a tag into a plain string or null.
// Handles: string, "", null, undefined, {name:"x"}, [{name:"x"}], ["x"]
function normalizeTag(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (!first) return null;
    return typeof first === "string" ? first || null : String(first.name ?? first.id ?? "");
  }
  if (typeof raw === "object") return String(raw.name ?? raw.id ?? "") || null;
  const s = String(raw).trim();
  return s || null;
}

function getTagColor(tagName) {
  if (!tagName) return null;
  const str = String(tagName);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffff;
  }
  return TAG_COLORS[hash % TAG_COLORS.length];
}

// --- FloatingLeaves ---
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

// --- TagHeader ---
function TagHeader({ tags, activeTag, onFilter, onDeleteGroup }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6 pb-5 border-b border-green-800/50">
      <button
        onClick={() => onFilter(null)}
        className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
          activeTag === null
            ? "bg-green-600 border-green-600 text-white"
            : "border-green-700 text-green-400 hover:border-green-500 hover:text-green-300"
        }`}
      >
        All
      </button>
      <AnimatePresence>
        {tags.map((tag) => {
          const color = getTagColor(tag.name);
          const isActive = activeTag === tag.name;
          return (
            <motion.div
              key={tag.id ?? tag.name}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium"
              style={{
                borderColor: color + "60",
                backgroundColor: isActive ? color + "30" : color + "10",
                color: color,
              }}
            >
              <button
                onClick={() => onFilter(isActive ? null : tag.name)}
                className="leading-none"
              >
                {tag.name}
              </button>
              <button
                onClick={() => onDeleteGroup(tag.name)}
                className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity leading-none"
                title={`Delete all "${tag.name}" todos`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// --- TagPicker dropdown (inline) ---
function TagPicker({ currentTag, allTags, onSelect, onClose }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-8 z-50 rounded-xl border border-green-800 bg-green-950/95 p-1.5 shadow-2xl backdrop-blur-sm min-w-[130px]"
    >
      <button
        onClick={() => onSelect(null)}
        className={`w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-green-900/50 ${
          !currentTag ? "text-green-300 font-medium" : "text-green-500"
        }`}
      >
        No tag
      </button>
      {allTags.map((t) => {
        const color = getTagColor(t);
        return (
          <button
            key={t}
            onClick={() => onSelect(t)}
            className="w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-green-900/50 flex items-center gap-2"
            style={{ color: currentTag === t ? color : color + "cc" }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className={currentTag === t ? "font-medium" : ""}>{t}</span>
          </button>
        );
      })}
    </div>
  );
}

// --- Todo ---
function Todo({ removeElement, handleCheck, handleTagChange, id, children, checked, tag, allTags }) {
  const [isPresent, safeToRemove] = usePresence();
  const [scope, animate] = useAnimate();
  const [showTagPicker, setShowTagPicker] = React.useState(false);
  const color = getTagColor(tag);

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
      {/* Tag color stripe */}
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0 transition-colors"
        style={{ backgroundColor: color ?? "transparent" }}
      />

      <input
        type="checkbox"
        checked={checked}
        onChange={() => handleCheck(id)}
        className="size-5 accent-green-600 cursor-pointer"
      />
      <p className={`flex-1 text-green-100 transition-colors ${checked ? "text-green-400 line-through" : ""}`}>
        {children}
      </p>

      {/* Tag button + picker */}
      <div className="relative">
        <button
          onClick={() => setShowTagPicker((pv) => !pv)}
          className="rounded-lg bg-green-900/30 px-2 py-1 text-xs transition-colors hover:bg-green-900/50 flex items-center gap-1"
          style={color ? { color } : { color: "#4b5563" }}
          title={tag ? `Tag: ${tag}` : "Add tag"}
        >
          <Tag className="w-3 h-3" />
          {tag && <span className="max-w-[64px] truncate hidden sm:inline">{tag}</span>}
        </button>

        {showTagPicker && (
          <TagPicker
            currentTag={tag}
            allTags={allTags}
            onSelect={(t) => { handleTagChange(id, t); setShowTagPicker(false); }}
            onClose={() => setShowTagPicker(false)}
          />
        )}
      </div>

      <button
        onClick={() => removeElement(id)}
        className="rounded-lg bg-red-900/30 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-900/50"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

// --- Todos ---
function Todos({ todos, handleCheck, removeElement, handleTagChange, allTags }) {
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
            handleTagChange={handleTagChange}
            tag={normalizeTag(t.tags)}
            allTags={allTags}
          >
            {t.content}
          </Todo>
        ))}
      </AnimatePresence>
    </div>
  );
}

// --- Form ---
function Form({ onAdd, tags }) {
  const [visible, setVisible] = React.useState(false);
  const [text, setText] = React.useState("");
  const [selectedTag, setSelectedTag] = React.useState(null);
  const [newTag, setNewTag] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const tag = newTag.trim() || selectedTag || null;
    await onAdd(text.trim(), tag);
    setText("");
    setSelectedTag(null);
    setNewTag("");
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
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
            className="mb-6 w-full rounded-xl border border-green-800 bg-green-950/90 p-4 shadow-lg backdrop-blur-sm"
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Plant a new task..."
              className="h-24 w-full resize-none rounded-lg bg-green-900/30 p-3 text-sm text-green-100 placeholder-green-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            {/* Tag selection */}
            <div className="mt-3">
              <p className="text-xs text-green-600 mb-2">Tag (optional)</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => { setSelectedTag(null); setNewTag(""); }}
                  className={`rounded-full px-2.5 py-0.5 text-xs border transition-colors ${
                    !selectedTag && !newTag.trim()
                      ? "bg-green-700/50 border-green-600 text-green-200"
                      : "border-green-800 text-green-600 hover:border-green-600 hover:text-green-400"
                  }`}
                >
                  None
                </button>
                {tags.map((tag) => {
                  const color = getTagColor(tag);
                  const isSelected = selectedTag === tag && !newTag.trim();
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => { setSelectedTag(tag); setNewTag(""); }}
                      className="rounded-full px-2.5 py-0.5 text-xs border transition-all"
                      style={{
                        borderColor: color + "60",
                        backgroundColor: isSelected ? color + "30" : "transparent",
                        color: isSelected ? color : color + "80",
                        opacity: isSelected ? 1 : 0.7,
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={newTag}
                onChange={(e) => { setNewTag(e.target.value); setSelectedTag(null); }}
                placeholder="Or create a new tag..."
                className="w-full rounded-lg bg-green-900/30 px-3 py-1.5 text-xs text-green-100 placeholder-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>

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

// --- Main ---
export default function OrganicTodoList() {
  const [todos, setTodos] = React.useState([]);
  const [tags, setTags] = React.useState([]);
  const [activeTag, setActiveTag] = React.useState(null);
  const [error, setError] = React.useState(null);

  async function fetchTags() {
    try {
      const res = await fetch("/api/tags/");
      const data = await res.json();
      setTags(
        data
          .map((t) => typeof t === "string" ? { id: null, name: t } : { id: t.id ?? null, name: normalizeTag(t) })
          .filter((t) => t.name)
      );
    } catch {
      // non-fatal
    }
  }

  React.useEffect(() => {
    fetch("/api/todos/")
      .then((r) => r.json())
      .then((data) => setTodos(data))
      .catch(() => setError("Failed to load todos. Is the backend running?"));
    fetchTags();
  }, []);

  const handleAdd = async (text, tag) => {
    try {
      const body = { content: text };
      if (tag) body.tags = [tag];
      const res = await fetch("/api/todos/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const newTodo = await res.json();
      setTodos((pv) => [newTodo, ...pv]);
      if (tag) await fetchTags();
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

  const handleTagChange = async (id, tag) => {
    try {
      const res = await fetch(`/api/todos/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: tag ? [tag] : [] }),
      });
      const updated = await res.json();
      setTodos((pv) => pv.map((t) => (t.id === id ? updated : t)));
      await fetchTags();
    } catch {
      setError("Failed to update tag.");
    }
  };

  const removeElement = async (id) => {
    try {
      await fetch(`/api/todos/${id}/`, { method: "DELETE" });
      setTodos((pv) => pv.filter((t) => t.id !== id));
      await fetchTags();
    } catch {
      setError("Failed to delete todo.");
    }
  };

  const deleteTagGroup = async (tagName) => {
    const tagObj = tags.find((t) => t.name === tagName);
    const toDelete = todos.filter((t) => normalizeTag(t.tags) === tagName);
    try {
      await Promise.all([
        ...toDelete.map((t) => fetch(`/api/todos/${t.id}/`, { method: "DELETE" })),
        ...(tagObj?.id != null ? [fetch(`/api/tags/${tagObj.id}/`, { method: "DELETE" })] : []),
      ]);
      setTodos((pv) => pv.filter((t) => normalizeTag(t.tags) !== tagName));
      setTags((pv) => pv.filter((t) => t.name !== tagName));
      if (activeTag === tagName) setActiveTag(null);
    } catch {
      setError("Failed to delete tag group.");
    }
  };

  const displayedTodos = activeTag
    ? todos.filter((t) => normalizeTag(t.tags) === activeTag)
    : todos;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-emerald-950 to-teal-950">
      <section className="relative min-h-screen flex items-center justify-center">
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

        <div className="relative z-10 container mx-auto px-4 md:px-6 py-16 pb-40">
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
              {tags.length > 0 && (
                <TagHeader
                  tags={tags}
                  activeTag={activeTag}
                  onFilter={setActiveTag}
                  onDeleteGroup={deleteTagGroup}
                />
              )}

              <Todos
                todos={displayedTodos}
                handleCheck={handleCheck}
                removeElement={removeElement}
                handleTagChange={handleTagChange}
                allTags={tags.map((t) => t.name)}
              />
            </motion.div>
          </div>
        </div>

        <Form onAdd={handleAdd} tags={tags.map((t) => t.name)} />
      </section>
    </div>
  );
}
