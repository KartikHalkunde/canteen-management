import React, { useEffect, useMemo, useState } from "react";
import {
  ShoppingCart,
  ChefHat,
  LogOut,
  User,
  Utensils,
  Clock,
  CheckCircle,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Bell,
  Shield
} from "lucide-react";
import { apiRequest } from "./lib/api.js";

const STORAGE_KEY = "canteen_auth";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const PAYMENT_METHODS = ["CASH", "UPI", "CARD"];
const ORDER_STATUSES = ["PENDING", "PREPARING", "READY", "COMPLETED"];

function loadAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveAuth(payload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function clearAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

function formatMoney(value) {
  const number = Number(value || 0);
  return `Rs ${number.toFixed(2)}`;
}

export default function App() {
  const [auth, setAuth] = useState(loadAuth());
  const [view, setView] = useState(() => {
    if (!auth) return "login";
    return auth.role === "ADMIN" ? "admin" : "menu";
  });

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [orders, setOrders] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [adminFilter, setAdminFilter] = useState("ALL");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [readyPopup, setReadyPopup] = useState("");

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: ""
  });

  const [orderForm, setOrderForm] = useState({
    paymentMethod: "CASH",
    notes: ""
  });

  const menuById = useMemo(() => {
    const map = new Map();
    menuItems.forEach((item) => map.set(item.id, item));
    return map;
  }, [menuItems]);

  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

  useEffect(() => {
    if (!auth) return;
    if (auth.role === "USER") {
      loadMenu();
      loadCategories();
      loadCart();
      const stopNotifications = startNotificationStream();
      return () => stopNotifications();
    }
    if (auth.role === "ADMIN") {
      loadAdminOrders();
    }
  }, [auth]);


  useEffect(() => {
    if (view !== "admin" || auth?.role !== "ADMIN") return;
    const interval = setInterval(() => {
      loadAdminOrders();
    }, 30000); // refresh every 30 seconds
    return () => clearInterval(interval);
  }, [view, auth]);

  useEffect(() => {
    if (view === "orders" && auth?.role === "USER") {
      loadOrders();
    }
    if (view === "cart" && auth?.role === "USER") {
      loadCart();
    }
    if (view === "admin" && auth?.role === "ADMIN") {
      loadAdminOrders();
    }
  }, [view, auth]);

  async function loadMenu() {
    try {
      const data = await apiRequest("/api/menu", { token: auth?.token });
      setMenuItems(data || []);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function loadCategories() {
    try {
      const data = await apiRequest("/api/menu/categories", { token: auth?.token });
      setCategories(data || []);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function loadCart() {
    try {
      const data = await apiRequest("/api/user/cart", { token: auth?.token });
      setCart(data || []);
      const total = await apiRequest("/api/user/cart/total", { token: auth?.token });
      setCartTotal(Number(total || 0));
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function loadOrders() {
    try {
      const data = await apiRequest("/api/user/orders", { token: auth?.token });
      setOrders(data || []);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function loadAdminOrders() {
    try {
      const data = await apiRequest("/api/admin/orders", { token: auth?.token });
      setAdminOrders(data || []);
    } catch (error) {
      setNotice(error.message);
    }
  }

  function startNotificationStream() {
    if (!auth?.token) {
      return () => {};
    }

    const controller = new AbortController();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    fetch(`${API_BASE_URL}/api/user/notifications/stream`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
        Accept: "text/event-stream"
      },
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok || !response.body) {
          throw new Error("Unable to open notification stream");
        }

        const reader = response.body.getReader();
        const read = () => reader.read().then(({ done, value }) => {
          if (done) return;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          events.forEach((rawEvent) => {
            let eventType = "";
            let data = "";
            rawEvent.split("\n").forEach((line) => {
              if (line.startsWith("event:")) {
                eventType = line.replace("event:", "").trim();
              }
              if (line.startsWith("data:")) {
                data += line.replace("data:", "").trim();
              }
            });

            if (eventType === "order-ready") {
              setReadyPopup(data || "Your order is ready. Please pick it up before it gets cold.");
              loadOrders();
            }
          });

          return read();
        });

        return read();
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setNotice(error.message);
        }
      });

    return () => controller.abort();
  }

  async function handleLogin(event) {
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    try {
      const payload = {
        email: authForm.email,
        password: authForm.password
      };
      const data = await apiRequest("/api/auth/login", { method: "POST", body: payload });
      const nextAuth = {
        token: data.token,
        role: data.role,
        name: data.name,
        email: authForm.email
      };
      setAuth(nextAuth);
      saveAuth(nextAuth);
      setView(data.role === "ADMIN" ? "admin" : "menu");
      setAuthForm({ name: "", email: "", password: "", phone: "" });
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    try {
      const payload = {
        name: authForm.name,
        email: authForm.email,
        password: authForm.password,
        phone: authForm.phone
      };
      const data = await apiRequest("/api/auth/register", { method: "POST", body: payload });
      const nextAuth = {
        token: data.token,
        role: data.role,
        name: data.name,
        email: authForm.email
      };
      setAuth(nextAuth);
      saveAuth(nextAuth);
      setView("menu");
      setAuthForm({ name: "", email: "", password: "", phone: "" });
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    clearAuth();
    setAuth(null);
    setView("login");
    setCart([]);
    setOrders([]);
    setAdminOrders([]);
  }

  async function addToCart(itemId) {
    try {
      await apiRequest("/api/user/cart/add", {
        method: "POST",
        token: auth?.token,
        body: { menuItemId: itemId, quantity: 1 }
      });
      await loadCart();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function updateCartItem(itemId, quantity) {
    try {
      await apiRequest(`/api/user/cart/update/${itemId}`, {
        method: "PUT",
        token: auth?.token,
        query: { quantity }
      });
      await loadCart();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function clearCart() {
    try {
      await apiRequest("/api/user/cart/clear", { method: "DELETE", token: auth?.token });
      await loadCart();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function placeOrder() {
    if (cart.length === 0) return;
    setBusy(true);
    try {
      await apiRequest("/api/user/orders/place", {
        method: "POST",
        token: auth?.token,
        body: {
          paymentMethod: orderForm.paymentMethod,
          notes: orderForm.notes
        }
      });
      setOrderForm({ paymentMethod: "CASH", notes: "" });
      await loadOrders();
      await loadCart();
      setView("orders");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateOrderStatus(orderId, action) {
    const actionPath = {
      PREPARING: `/api/admin/orders/${orderId}/prepare`,
      READY: `/api/admin/orders/${orderId}/ready`,
      COMPLETED: `/api/admin/orders/${orderId}/complete`
    };

    const path = actionPath[action];
    if (!path) return;

    try {
      await apiRequest(path, { method: "PATCH", token: auth?.token });
      await loadAdminOrders();
    } catch (error) {
      setNotice(error.message);
    }
  }

  const filteredMenu = selectedCategory === "ALL"
    ? menuItems
    : menuItems.filter((item) => item.category?.id === Number(selectedCategory));

  const statusPriority = {
    PENDING: 0,
    PREPARING: 1,
    READY: 2,
    COMPLETED: 3
  };

  const sortedAdminOrders = [...adminOrders].sort((a, b) => {
    const statusDiff = (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bTime - aTime;
  });

  const filteredAdminOrders = adminFilter === "ALL"
    ? sortedAdminOrders
    : sortedAdminOrders.filter((order) => order.status === adminFilter);

  const statusBadge = (status) => {
    const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium gap-1";
    if (status === "PENDING") {
      return <span className={`${base} bg-yellow-100 text-yellow-800`}><Clock className="h-3 w-3" />Pending</span>;
    }
    if (status === "PREPARING") {
      return <span className={`${base} bg-blue-100 text-blue-800`}><ChefHat className="h-3 w-3" />Preparing</span>;
    }
    if (status === "READY") {
      return <span className={`${base} bg-green-100 text-green-800`}><Bell className="h-3 w-3" />Ready</span>;
    }
    return <span className={`${base} bg-green-100 text-green-800`}><CheckCircle className="h-3 w-3" />Completed</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-2">
              <ChefHat className="h-8 w-8 text-amber-500" />
              <span className="text-xl font-bold text-gray-900">CampusBites</span>
            </div>

            {auth && (
              <div className="flex items-center space-x-6">
                {auth.role === "USER" && (
                  <>
                    <button onClick={() => setView("menu")} className={`text-sm font-medium ${view === "menu" ? "text-amber-500" : "text-gray-600 hover:text-gray-900"}`}>
                      Menu
                    </button>
                    <button onClick={() => setView("orders")} className={`text-sm font-medium ${view === "orders" ? "text-amber-500" : "text-gray-600 hover:text-gray-900"}`}>
                      My Orders
                    </button>
                    <button onClick={() => setView("cart")} className="relative p-2 text-gray-600 hover:text-amber-500 transition-colors" aria-label="Cart">
                      <ShoppingCart className="h-6 w-6" />
                      {cartCount > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
                          {cartCount}
                        </span>
                      )}
                    </button>
                  </>
                )}
                {auth.role === "ADMIN" && (
                  <button onClick={() => setView("admin")} className={`text-sm font-medium ${view === "admin" ? "text-amber-500" : "text-gray-600 hover:text-gray-900"}`}>
                    Dashboard
                  </button>
                )}

                <div className="flex items-center space-x-3 border-l pl-6 border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-700">
                    {auth.role === "ADMIN" ? <Shield className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    <span className="text-sm font-medium">{auth.name}</span>
                  </div>
                  <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Logout">
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {notice && (
        <div className="mx-auto mt-4 max-w-4xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {notice}
        </div>
      )}

      {readyPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-200 text-center">
            <div className="mx-auto h-14 w-14 bg-amber-50 rounded-full flex items-center justify-center">
              <Bell className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-gray-900">Order Update</h3>
            <p className="mt-2 text-sm text-gray-600">
              {readyPopup || "Your order is ready. Please pick it up before it gets cold."}
            </p>
            <button
              onClick={() => setReadyPopup("")}
              className="mt-6 w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-amber-600 hover:bg-amber-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <main>
        {!auth && (view === "login" || view === "register") && (
          <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
              <div className="text-center">
                <ChefHat className="mx-auto h-16 w-16 text-amber-500" />
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                  {view === "login" ? "Sign in to your account" : "Create a new account"}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {view === "login" ? "Or " : "Already have an account? "}
                  <button
                    onClick={() => {
                      setView(view === "login" ? "register" : "login");
                      setAuthError("");
                    }}
                    className="font-medium text-amber-600 hover:text-amber-500"
                  >
                    {view === "login" ? "register here" : "sign in here"}
                  </button>
                </p>
              </div>

              <form className="mt-8 space-y-6" onSubmit={view === "login" ? handleLogin : handleRegister}>
                <div className="rounded-md shadow-sm space-y-4">
                  {view === "register" && (
                    <div>
                      <label className="sr-only">Full name</label>
                      <input
                        type="text"
                        required
                        className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm"
                        placeholder="Full name"
                        value={authForm.name}
                        onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                      />
                    </div>
                  )}
                  <div>
                    <label className="sr-only">Email</label>
                    <input
                      type="email"
                      required
                      className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm"
                      placeholder="Email"
                      value={authForm.email}
                      onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                    />
                  </div>
                  <div>
                    <label className="sr-only">Password</label>
                    <input
                      type="password"
                      required
                      className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm"
                      placeholder="Password"
                      value={authForm.password}
                      onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                    />
                  </div>
                  {view === "register" && (
                    <div>
                      <label className="sr-only">Phone</label>
                      <input
                        type="tel"
                        className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm"
                        placeholder="Phone"
                        value={authForm.phone}
                        onChange={(event) => setAuthForm({ ...authForm, phone: event.target.value })}
                      />
                    </div>
                  )}
                </div>

                {authError && <p className="text-red-500 text-sm text-center font-medium">{authError}</p>}

                <div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {busy ? "Please wait..." : view === "login" ? "Sign In" : "Register"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {auth?.role === "USER" && view === "menu" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Today&apos;s Menu</h1>
                <p className="mt-2 text-gray-600">Fresh and hot, ready for you.</p>
              </div>
            </div>

            <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory("ALL")}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === "ALL"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-amber-50 hover:text-amber-600"
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(`${category.id}`)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === `${category.id}`
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-amber-50 hover:text-amber-600"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMenu.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-32 bg-amber-50 flex items-center justify-center text-4xl">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-amber-600">{item.name?.charAt(0) || "F"}</span>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                          {item.category?.name || "Uncategorized"}
                        </span>
                        <h3 className="mt-1 text-lg font-bold text-gray-900">{item.name}</h3>
                      </div>
                      <span className="text-lg font-bold text-green-600">{formatMoney(item.price)}</span>
                    </div>
                    {item.description && (
                      <p className="mt-2 text-sm text-gray-500 line-clamp-2">{item.description}</p>
                    )}
                    <button
                      onClick={() => addToCart(item.id)}
                      disabled={!item.available}
                      className={`mt-6 w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                        item.available
                          ? "bg-gray-900 hover:bg-gray-800 text-white"
                          : "bg-gray-400 text-white cursor-not-allowed"
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      <span>{item.available ? "Add to Cart" : "Unavailable"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {auth?.role === "USER" && view === "cart" && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>

            {cart.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Your cart is empty</h3>
                <p className="mt-2 text-gray-500">Looks like you haven&apos;t added any items yet.</p>
                <button onClick={() => setView("menu")} className="mt-6 text-amber-600 font-medium hover:text-amber-700">
                  Browse Menu &rarr;
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {cart.map((item) => {
                    const menuItem = menuById.get(item.menuItemId);
                    const quantity = item.quantity || 0;
                    return (
                      <li key={item.menuItemId} className="p-6 flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{menuItem?.name || "Item"}</h4>
                          <p className="text-sm text-gray-500">{formatMoney(menuItem?.price)} x {quantity}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1">
                            <button onClick={() => updateCartItem(item.menuItemId, quantity - 1)} className="text-gray-500 hover:text-amber-600">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-sm font-semibold text-gray-800">{quantity}</span>
                            <button onClick={() => updateCartItem(item.menuItemId, quantity + 1)} className="text-gray-500 hover:text-amber-600">
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <button onClick={() => updateCartItem(item.menuItemId, 0)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="bg-gray-50 p-6 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-lg font-medium text-gray-900">Total Amount</span>
                    <span className="text-2xl font-bold text-green-600">{formatMoney(cartTotal)}</span>
                  </div>
                  <button
                    onClick={placeOrder}
                    disabled={busy}
                    className="w-full flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-xl font-bold text-lg transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span>Confirm Purchase</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    <select
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                      value={orderForm.paymentMethod}
                      onChange={(event) => setOrderForm({ ...orderForm, paymentMethod: event.target.value })}
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                      placeholder="Order notes (optional)"
                      value={orderForm.notes}
                      onChange={(event) => setOrderForm({ ...orderForm, notes: event.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {auth?.role === "USER" && view === "orders" && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

            {orders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                <Utensils className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No orders yet</h3>
                <p className="mt-2 text-gray-500">Go to the menu to place your first order.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Order #{String(order.id).slice(-6)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{order.createdAt?.replace("T", " ") || "recently"}</p>
                      </div>
                      {statusBadge(order.status)}
                    </div>
                    <div className="px-6 py-4">
                      <ul className="divide-y divide-gray-100">
                        {order.orderItems?.map((item) => (
                          <li key={item.id} className="py-2 flex justify-between text-sm">
                            <span className="text-gray-700">{item.quantity}x {item.menuItem?.name || "Item"}</span>
                            <span className="font-medium text-gray-900">{formatMoney(item.unitPrice * item.quantity)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <span className="font-medium text-gray-900">Total</span>
                        <span className="font-bold text-lg text-green-600">{formatMoney(order.totalPrice)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {auth?.role === "ADMIN" && view === "admin" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Kitchen Dashboard</h1>
                <p className="mt-2 text-gray-600">Manage incoming orders and update statuses.</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex space-x-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{sortedAdminOrders.filter((o) => o.status === "PENDING").length}</p>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Pending</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{sortedAdminOrders.filter((o) => o.status === "PREPARING").length}</p>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Preparing</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 mb-6">
              {["ALL", "PENDING", "PREPARING", "READY", "COMPLETED"].map((filterStatus) => (
                <button
                  key={filterStatus}
                  onClick={() => setAdminFilter(filterStatus)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    adminFilter === filterStatus
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {filterStatus === "ALL" ? "All Orders" : filterStatus.charAt(0) + filterStatus.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {filteredAdminOrders.length === 0 ? (
                <div className="text-center py-16">
                  <ChefHat className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No {adminFilter !== "ALL" ? adminFilter.toLowerCase() : "active"} orders</h3>
                  <p className="mt-2 text-gray-500">The kitchen queue is currently empty.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID & Time</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Items</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAdminOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">#{String(order.id).slice(-6)}</div>
                            <div className="text-xs text-gray-500">{order.createdAt?.replace("T", " ") || ""}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{order.user?.name || "Unknown"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600 max-w-xs">
                              {order.orderItems?.map((i) => `${i.quantity}x ${i.menuItem?.name || "Item"}`).join(", ")}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">{formatMoney(order.totalPrice)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {statusBadge(order.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {order.status === "PENDING" && (
                              <button
                                onClick={() => updateOrderStatus(order.id, "PREPARING")}
                                className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
                              >
                                Accept & Prepare
                              </button>
                            )}
                            {order.status === "PREPARING" && (
                              <button
                                onClick={() => updateOrderStatus(order.id, "READY")}
                                className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 transition-colors"
                              >
                                Mark Ready
                              </button>
                            )}
                            {order.status === "READY" && (
                              <button
                                onClick={() => updateOrderStatus(order.id, "COMPLETED")}
                                className="text-gray-600 hover:text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 transition-colors"
                              >
                                Mark Completed
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
