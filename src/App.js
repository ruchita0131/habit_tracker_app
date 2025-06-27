import "./App.css";
import React, { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { Check, Trash2, Plus, Sun, Moon, Zap, Target } from "lucide-react";

// --- Firebase Configuration ---
// This configuration is provided by the environment.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
};

const appId = process.env.REACT_APP_APP_ID || "default-habit-tracker";
//typeof __app_id !== "undefined" ? __app_id : "default-habit-tracker";

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
console.log("API KEY from env:", process.env.REACT_APP_FIREBASE_API_KEY);

const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper Functions ---
const getWeekStartDate = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

// --- React Components ---

const Header = ({ userId }) => (
  <header className="mb-8 p-4 bg-gray-800 rounded-lg shadow-lg">
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-3">
        <Target className="w-8 h-8 text-indigo-400" />
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Weekly Habit Tracker
        </h1>
      </div>
      {userId && (
        <div className="text-right">
          <span className="text-xs text-gray-400 block">User ID</span>
          <span className="text-sm font-mono text-indigo-300 bg-gray-700 px-2 py-1 rounded">
            {userId}
          </span>
        </div>
      )}
    </div>
  </header>
);

const PriorityInput = ({ onAdd }) => {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text.trim());
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="New weekly priority..."
        className="flex-grow bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
      />
      <button
        type="submit"
        className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 transition duration-200 flex items-center justify-center"
      >
        <Plus size={20} />
      </button>
    </form>
  );
};

const PriorityItem = ({ item, onToggle, onDelete }) => (
  <li className="flex items-center justify-between p-3 bg-gray-800 rounded-lg my-2 transition-all duration-300 ease-in-out hover:bg-gray-700/50">
    <div className="flex items-center space-x-3">
      <button
        onClick={() => onToggle(item.id, !item.completed)}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
          item.completed
            ? "border-green-500 bg-green-500"
            : "border-gray-500 hover:border-indigo-400"
        }`}
      >
        {item.completed && <Check size={16} className="text-white" />}
      </button>
      <span
        className={`text-white ${
          item.completed ? "line-through text-gray-400" : ""
        }`}
      >
        {item.text}
      </span>
    </div>
    <button
      onClick={() => onDelete(item.id)}
      className="text-gray-500 hover:text-red-500 transition-colors"
    >
      <Trash2 size={18} />
    </button>
  </li>
);

const WeeklyPriorities = ({ userId, db }) => {
  const [priorities, setPriorities] = useState([]);

  useEffect(() => {
    if (!userId) return;
    const prioritiesCollectionRef = collection(
      db,
      "artifacts",
      appId,
      "users",
      userId,
      "priorities"
    );
    const unsubscribe = onSnapshot(prioritiesCollectionRef, (snapshot) => {
      const prioritiesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPriorities(prioritiesList);
    });
    return () => unsubscribe();
  }, [userId, db]);

  const addPriority = async (text) => {
    const prioritiesCollectionRef = collection(
      db,
      "artifacts",
      appId,
      "users",
      userId,
      "priorities"
    );
    await addDoc(prioritiesCollectionRef, { text, completed: false });
  };

  const togglePriority = async (id, completed) => {
    const priorityDocRef = doc(
      db,
      "artifacts",
      appId,
      "users",
      userId,
      "priorities",
      id
    );
    await updateDoc(priorityDocRef, { completed });
  };

  const deletePriority = async (id) => {
    const priorityDocRef = doc(
      db,
      "artifacts",
      appId,
      "users",
      userId,
      "priorities",
      id
    );
    await deleteDoc(priorityDocRef);
  };

  return (
    <div className="bg-gray-900/50 p-6 rounded-xl shadow-2xl border border-gray-700">
      <div className="flex items-center space-x-3 mb-4">
        <Zap className="w-6 h-6 text-yellow-400" />
        <h2 className="text-xl font-semibold text-white">Weekly Priorities</h2>
      </div>
      <PriorityInput onAdd={addPriority} />
      <ul className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-2">
        {priorities.map((item) => (
          <PriorityItem
            key={item.id}
            item={item}
            onToggle={togglePriority}
            onDelete={deletePriority}
          />
        ))}
        {priorities.length === 0 && (
          <p className="text-gray-400 text-center py-4">
            No priorities yet. Add one above!
          </p>
        )}
      </ul>
    </div>
  );
};

const HabitInput = ({ onAdd }) => {
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim());
      setName("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2 mt-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New habit..."
        className="flex-grow bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
      />
      <button
        type="submit"
        className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition duration-200 flex items-center justify-center"
      >
        <Plus size={20} />
      </button>
    </form>
  );
};

const HabitTracker = ({ userId, db }) => {
  const [habits, setHabits] = useState([]);
  const [weekStart, setWeekStart] = useState(getWeekStartDate(new Date()));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const weekIdentifier = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;

  useEffect(() => {
    if (!userId) return;

    const habitsCollectionRef = collection(
      db,
      "artifacts",
      appId,
      "users",
      userId,
      "habits"
    );
    const q = query(habitsCollectionRef, where("week", "==", weekIdentifier));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const habitsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setHabits(habitsList);
    });

    // Check if habits for this week exist, if not, create them from last week's
    const checkAndCarryOverHabits = async () => {
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        const lastWeekStart = new Date(weekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekIdentifier = `${lastWeekStart.getFullYear()}-${lastWeekStart.getMonth()}-${lastWeekStart.getDate()}`;
        const lastWeekQuery = query(
          collection(db, "artifacts", appId, "users", userId, "habits"),
          where("week", "==", lastWeekIdentifier)
        );
        const lastWeekSnapshot = await getDocs(lastWeekQuery);

        if (!lastWeekSnapshot.empty) {
          const batch = writeBatch(db);
          lastWeekSnapshot.docs.forEach((doc) => {
            const newHabitRef = doc(
              collection(db, "artifacts", appId, "users", userId, "habits")
            );
            batch.set(newHabitRef, {
              name: doc.data().name,
              week: weekIdentifier,
              progress: Array(7).fill(false),
            });
          });
          await batch.commit();
        }
      }
    };

    checkAndCarryOverHabits();

    return () => unsubscribe();
  }, [userId, db, weekIdentifier]);

  const addHabit = async (name) => {
    const habitsCollectionRef = collection(
      db,
      "artifacts",
      appId,
      "users",
      userId,
      "habits"
    );
    await addDoc(habitsCollectionRef, {
      name,
      week: weekIdentifier,
      progress: Array(7).fill(false),
    });
  };

  const toggleHabit = async (id, dayIndex) => {
    const habitDocRef = doc(
      db,
      "artifacts",
      appId,
      "users",
      userId,
      "habits",
      id
    );
    const habit = habits.find((h) => h.id === id);
    if (habit) {
      const newProgress = [...habit.progress];
      newProgress[dayIndex] = !newProgress[dayIndex];
      await updateDoc(habitDocRef, { progress: newProgress });
    }
  };

  const deleteHabit = async (id) => {
    const habitDocRef = doc(
      db,
      "artifacts",
      appId,
      "users",
      userId,
      "habits",
      id
    );
    await deleteDoc(habitDocRef);
  };

  const navigateWeek = (direction) => {
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(newWeekStart.getDate() + direction * 7);
    setWeekStart(newWeekStart);
  };

  return (
    <div className="bg-gray-900/50 p-6 rounded-xl shadow-2xl border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Sun className="w-6 h-6 text-orange-400" />
          <Moon className="w-5 h-5 text-indigo-300" />
          <h2 className="text-xl font-semibold text-white">Habit Tracker</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white"
          >
            &lt;
          </button>
          <span className="text-sm text-gray-300 font-medium">
            {weekStart.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
          <button
            onClick={() => navigateWeek(1)}
            className="p-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white"
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 text-sm font-medium text-gray-300">
                Habit
              </th>
              {weekDays.map((day, i) => (
                <th
                  key={i}
                  className="text-center p-2 text-sm font-medium text-gray-300"
                >
                  <div className="flex flex-col items-center">
                    <span>
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className="text-xs text-gray-400">
                      {day.getDate()}
                    </span>
                  </div>
                </th>
              ))}
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {habits.map((habit) => (
              <tr
                key={habit.id}
                className="border-t border-gray-700 hover:bg-gray-800/50"
              >
                <td className="p-3 text-white font-medium whitespace-nowrap">
                  {habit.name}
                </td>
                {habit.progress.map((done, dayIndex) => (
                  <td key={dayIndex} className="p-3 text-center">
                    <button
                      onClick={() => toggleHabit(habit.id, dayIndex)}
                      className={`w-7 h-7 rounded-md flex items-center justify-center m-auto transition-all ${
                        done
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-gray-600 hover:bg-gray-500"
                      }`}
                    >
                      {done && <Check size={18} className="text-white" />}
                    </button>
                  </td>
                ))}
                <td className="p-3 text-center">
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    className="text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {habits.length === 0 && (
        <p className="text-gray-400 text-center py-6">
          No habits for this week. Add one below!
        </p>
      )}

      <HabitInput onAdd={addHabit} />
    </div>
  );
};

export default function App() {
  const [userId, setUserId] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const initialToken = process.env.REACT_APP_AUTH_TOKEN;

        if (initialToken) {
          await signInWithCustomToken(auth, initialToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Authentication Error:", error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
      setAuthReady(true);
    });

    initAuth();

    return () => unsubscribe();
  }, []);

  if (!authReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="flex items-center space-x-3">
          <svg
            className="animate-spin h-8 w-8 text-indigo-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-xl font-medium">
            Connecting to your board...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Header userId={userId} />
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <WeeklyPriorities userId={userId} db={db} />
          <HabitTracker userId={userId} db={db} />
        </main>
        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Built with React & Firebase. Inspired by your design.</p>
        </footer>
      </div>
    </div>
  );
}
console.log("Firebase config:", firebaseConfig);
