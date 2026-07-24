"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { PRODUCTS, SHIPPING_FLAT } from "@/lib/products";
import { getVatInfo } from "@/lib/vat";
import {
  base, useStyleInjection, generateOrderNumber, ORDER_STATUSES, PROMO_CODES_DEFAULT,
  Logo, Toast, ConfirmModal, AuthScreen, labelStyle, inputStyle,
} from "./components/shared";
import LandingView from "./components/LandingView";
import ProfileView from "./components/ProfileView";
import CatalogView from "./components/CatalogView";
import CheckoutView from "./components/CheckoutView";
import MyOrdersView from "./components/MyOrdersView";
import AdminView from "./components/AdminView";
import InvoiceView from "./components/InvoiceView";

/* ═══════════════════════════════════════════
   MAIN APP

   This file owns all state and all server calls. Views are pure(ish)
   presentational components in ./components/ — each gets exactly the
   state/handlers its JSX references, passed as named props. See
   ./components/shared.js for the constants and small building blocks
   (Logo, Toast, ConfirmModal, AuthScreen, Header/UserNav, etc.) reused
   across more than one view.
   ═══════════════════════════════════════════ */

export default function DeeB2B() {
  useStyleInjection();

  const [session, setSession] = useState(null); // { id, email, role } | null
  const [loading, setLoading] = useState(true);
  const [authForm, setAuthForm] = useState({ company:"", email:"" });
  const [authError, setAuthError] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [admins, setAdmins] = useState([]);
  const [adminManageForm, setAdminManageForm] = useState({ email: "", company: "" });
  const [buyers, setBuyers] = useState([]);
  const [syncFailures, setSyncFailures] = useState([]);
  const [buyerManageForm, setBuyerManageForm] = useState({ email: "", company: "" });
  const [adminExpanded, setAdminExpanded] = useState(null);
  const [adminCompanyFilter, setAdminCompanyFilter] = useState(null);
  const [adminStatusFilter, setAdminStatusFilter] = useState("all");
  const [allOrders, setAllOrders] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [view, setView] = useState("landing");
  const [buyer, setBuyer] = useState({ company:"",address:"",city:"",country:"",zip:"",vat:"",email:"",contact:"" });
  const [orderNumber, setOrderNumber] = useState(generateOrderNumber);
  const [viewingOrderId, setViewingOrderId] = useState(null);
  const pendingDeepOrder = useRef(null);
  const viewRef = useRef(view);
  const [invoiceSource, setInvoiceSource] = useState(null);
  const [invoiceViewType, setInvoiceViewType] = useState("deposit"); // "deposit" or "balance"
  const invoiceRef = useRef(null);

  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoCodes, setPromoCodes] = useState(PROMO_CODES_DEFAULT);
  const [promoError, setPromoError] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [adminPromoForm, setAdminPromoForm] = useState({ code: "", label: "", prices: { "100 ML": "", "50 ML": "", "20 ML": "", "2 ML": "", "KIT": "" } });

  // company comes from the buyer profile (loaded separately), not the
  // session — the session only carries { id, email, role }.
  const currentUser = session ? { company: buyer.company || "", email: session.email } : null;

  const [toast, setToast] = useState({ visible: false, message: "" });
  const showToast = useCallback((msg) => setToast({ visible: true, message: msg }), []);
  const hideToast = useCallback(() => setToast(t => ({ ...t, visible: false })), []);

  const [confirm, setConfirm] = useState({ open: false, title: "", message: "", onConfirm: null, danger: false, confirmLabel: "" });
  const askConfirm = (opts) => setConfirm({ open: true, ...opts });
  const closeConfirm = () => setConfirm(c => ({ ...c, open: false }));

  const [noteInputs, setNoteInputs] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ── Error Log (visible in admin panel) ──
  const [errorLog, setErrorLog] = useState([]);
  const logError = useCallback((source, detail) => {
    const entry = { ts: new Date().toISOString(), source, detail: typeof detail === "string" ? detail : JSON.stringify(detail) };
    setErrorLog(prev => [entry, ...prev].slice(0, 50));
    console.error(`[${source}]`, detail);
  }, []);

  // Feature 2: Order Editing
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editQtys, setEditQtys] = useState({});

  // Feature 3: Inventory Management
  const [inventory, setInventory] = useState({});

  const getQty = (sku) => quantities[sku] || 0;
  const getStock = (sku) => { const s = inventory[sku]; return (s !== undefined && s !== null) ? s : null; };
  const setQty = (sku, val) => {
    const stock = getStock(sku);
    const clamped = stock !== null ? Math.min(Math.max(0, val), stock) : Math.max(0, val);
    setQuantities((q) => ({ ...q, [sku]: clamped }));
  };

  const orderLines = [];
  let totalWSP = 0;
  PRODUCTS.forEach((p) => p.variants.forEach((v) => {
    const qty = getQty(v.sku);
    if (qty > 0) {
      const unitPrice = appliedPromo?.discount_type === "fixed_prices" && appliedPromo.prices[v.size] !== undefined
        ? appliedPromo.prices[v.size]
        : v.wsp;
      orderLines.push({product:p.name,size:v.size,sku:v.sku,ean:v.ean,qty,unitPrice,total:qty*unitPrice});
      totalWSP += qty*unitPrice;
    }
  }));

  const vatInfo = getVatInfo(buyer.country, buyer.vat);
  const vatAmount = Math.round(totalWSP * vatInfo.rate * 100) / 100;
  const totalItems = orderLines.reduce((s,l) => s+l.qty, 0);
  const shippingAmount = totalItems > 0 ? SHIPPING_FLAT : 0;
  const totalBeforeShipping = totalWSP + vatAmount;
  const totalWithVat = totalBeforeShipping + shippingAmount;
  // No 30/70 split — first invoice is shipping only, second is the full order value.
  const depositAmount = shippingAmount;
  const depositInvoiceTotal = depositAmount;

  useEffect(() => { viewRef.current = view; }, [view]);

  useEffect(() => {
    // Check URL params for deep linking from emails.
    const params = new URLSearchParams(window.location.search);
    const deepOrder = params.get("order");
    if (deepOrder) pendingDeepOrder.current = deepOrder;

    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(({ session: s }) => {
        setSession(s);
        setLoading(false);
        if (s) {
          loadProfile();
          loadOrders();
          if (pendingDeepOrder.current) { setViewingOrderId(pendingDeepOrder.current); setInvoiceSource("myorders"); setView("invoice"); pendingDeepOrder.current = null; }
          else if (viewRef.current === "landing" || viewRef.current === "login") setView(s.role === "admin" ? "admin" : "catalog");
        }
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPromoCodes();
    loadInventory();
  }, []);

  const loadPromoCodes = async () => {
    try {
      const res = await fetch("/api/promo-codes");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { promoCodes: data } = await res.json();
      setPromoCodes(data && data.length > 0 ? data : PROMO_CODES_DEFAULT);
    } catch (e) {
      logError("loadPromoCodes", e.message || e);
      setPromoCodes(PROMO_CODES_DEFAULT);
    }
  };

  // Feature 3: Load and save inventory
  const loadInventory = async () => {
    try {
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { inventory: rows } = await res.json();
      const inv = {};
      (rows || []).forEach((row) => { inv[row.sku] = row.stock; });
      setInventory(inv);
    } catch (e) {
      logError("loadInventory", e.message || e);
      setInventory({});
    }
  };

  const saveInventory = async () => {
    try {
      const records = [];
      PRODUCTS.forEach(p => {
        p.variants.forEach(v => {
          records.push({ sku: v.sku, product_name: p.name, size: v.size, stock: inventory[v.sku] || 0 });
        });
      });
      const res = await fetch("/api/inventory", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `HTTP ${res.status}`); }
      showToast("Inventory saved");
    } catch (e) {
      logError("saveInventory", e.message || e); showToast("Error saving inventory: " + e.message);
    }
  };

  // Returns the loaded profile so callers (e.g. handleVerifyOtp) can use it
  // immediately without waiting on a second render for `buyer` state to update.
  const loadProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return null;
      const { profile: data } = await res.json();
      if (!data) return null;
      const mapped = { company: data.company||"", contact: data.contact||"", address: data.address||"", city: data.city||"", country: data.country||"", zip: data.zip||"", vat: data.vat||"", email: data.email||"" };
      setBuyer(mapped);
      return mapped;
    } catch (e) {
      logError("loadProfile", e.message || e);
      return null;
    }
  };

  const loadOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) return;
      const { orders } = await res.json();
      setAllOrders(orders || []);
    } catch (e) {
      logError("loadOrders", e.message || e);
    }
  };

  const saveProfile = async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buyer) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      logError("saveProfile", e.message || e);
    }
  };

  // Buyers are passwordless: register/sign-in both end at the same "enter
  // the code we emailed you" screen.
  const handleRegister = async () => {
    setAuthError("");
    if (!authForm.company || !authForm.email) { setAuthError("Company name and email are required"); return; }
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authForm.email, company: authForm.company }) });
      const data = await res.json();
      if (!res.ok) { logError("handleRegister", data.error); setAuthError(data.error || "Registration failed"); return; }
      setBuyer(b => ({...b, company: authForm.company, email: authForm.email}));
      setOtpEmail(data.email);
      setView("otp");
      showToast("Code sent — check your email");
    } catch (e) {
      logError("handleRegister", e.message || e);
      setAuthError("Registration failed");
    }
  };

  const handleRequestOtp = async () => {
    setAuthError("");
    if (!authForm.email) { setAuthError("Enter your email address"); return; }
    try {
      const res = await fetch("/api/auth/request-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authForm.email }) });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || "Something went wrong"); return; }
      setOtpEmail(data.email);
      setView("otp");
      showToast("Code sent — check your email");
    } catch (e) {
      setAuthError("Something went wrong");
    }
  };

  const handleVerifyOtp = async () => {
    setAuthError("");
    if (!otpCode || otpCode.trim().length !== 6) { setAuthError("Enter the 6-digit code"); return; }
    try {
      const res = await fetch("/api/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: otpEmail, code: otpCode.trim() }) });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || "Verification failed"); return; }
      setSession({ id: data.id, email: data.email, role: data.role });
      setOtpCode(""); setOtpEmail(""); setAuthForm({company:"",email:""});
      const profile = await loadProfile();
      await loadOrders();
      setView(data.role === "admin" ? "admin" : "catalog");
      showToast("Welcome" + (profile?.company ? ", " + profile.company : ""));
    } catch (e) {
      setAuthError("Verification failed");
    }
  };

  const handleLogout = async () => {
    await saveProfile();
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch (e) {}
    setSession(null); setQuantities({}); setView("landing");
    setBuyer({company:"",address:"",city:"",country:"",zip:"",vat:"",email:"",contact:""});
    setOrderNumber(generateOrderNumber());
    setPromoCode(""); setAppliedPromo(null);
  };

  const applyPromoCode = () => {
    setPromoError("");
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) { setPromoError("Enter a promo code"); return; }
    const found = promoCodes.find(p => p.code.toUpperCase() === code);
    if (!found) { setPromoError("Invalid code"); return; }
    setAppliedPromo(found);
    setPromoCode(code);
    showToast(`✓ ${found.label} pricing applied`);
    setPromoCodeInput("");
  };

  const handleSubmitOrder = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const items = orderLines.map(l => ({ sku: l.sku, qty: l.qty }));
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, buyer, promoCode: appliedPromo?.code || null }),
      });
      const data = await res.json();
      if (!res.ok) { logError("handleSubmitOrder", data.error); showToast(data.error || "Failed to place order"); return; }

      await loadOrders();
      await loadInventory();
      const placedOrderId = data.order.id;
      setViewingOrderId(placedOrderId);
      setInvoiceSource("buyer");
      setView("invoice");
      showToast("Order placed — " + placedOrderId);
      setQuantities({});
      setAppliedPromo(null);
      setPromoCode("");
      setOrderNumber(generateOrderNumber());
    } catch (e) {
      logError("handleSubmitOrder", e.message || e);
      showToast("Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewInvoice = (orderId, source, invType = "deposit") => { setViewingOrderId(orderId); setInvoiceSource(source); setInvoiceViewType(invType); setView("invoice"); };

  // Status toggling, email dispatch, and PDF generation are all handled
  // server-side now (app/api/orders/[id]/status/route.js) — this just
  // reflects the confirmed new statuses back into local state.
  const toggleOrderStatus = async (orderId, key) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
      const data = await res.json();
      if (!res.ok) { logError("toggleOrderStatus:" + key, data.error); showToast("Failed to update status — " + (data.error || "")); return; }
      setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, statuses: data.statuses} : o));
    } catch (e) {
      logError("toggleOrderStatus:" + key, e.message || e);
      showToast("Failed to update status");
    }
  };

  const restoreOrder = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/restore`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) { logError("restoreOrder", data.error); showToast("Failed to restore — " + (data.error || "")); return; }
      setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, cancelled:false} : o));
      await loadInventory();
      showToast("Order " + orderId + " restored");
    } catch (e) {
      logError("restoreOrder", e.message || e);
      showToast("Failed to restore order");
    }
  };

  const deleteOrder = (orderId) => {
    askConfirm({
      title: "Delete Order Permanently",
      message: `This will permanently delete order ${orderId}. This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) { logError("deleteOrder", data.error); showToast("Failed to delete — " + (data.error || "")); closeConfirm(); return; }
          setAllOrders(prev => prev.filter(o => o.id !== orderId));
          closeConfirm();
          showToast("Order " + orderId + " deleted");
        } catch (e) {
          logError("deleteOrder", e.message || e);
          showToast("Failed to delete order");
          closeConfirm();
        }
      }
    });
  };

  // Cancel now refunds inventory server-side (app/api/orders/[id]/cancel/route.js)
  // and sends the buyer/admin emails itself — nothing left to do here but
  // reflect the confirmed result into local state.
  const cancelOrder = (orderId, fromAdmin) => {
    askConfirm({
      title: "Cancel Order",
      message: fromAdmin
        ? `Cancel order ${orderId}? You can restore it later.`
        : `Cancel order ${orderId}? Contact us if you need to reinstate it.`,
      confirmLabel: "Cancel Order",
      danger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "PATCH" });
          const data = await res.json();
          if (!res.ok) { logError("cancelOrder", data.error); showToast("Failed to cancel — " + (data.error || "")); closeConfirm(); return; }
          setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, cancelled:true} : o));
          await loadInventory();
          closeConfirm();
          showToast("Order " + orderId + " cancelled");
        } catch (e) {
          logError("cancelOrder", e.message || e);
          showToast("Failed to cancel order");
          closeConfirm();
        }
      }
    });
  };

  const canClientCancel = (order) => {
    if (order.cancelled) return false;
    const s = order.statuses;
    return !s.deposit_paid && !s.packed && !s.balance_invoiced && !s.balance_paid && !s.shipped && !s.received;
  };

  // Feature 2: Handle order updates — stock validation, price re-derivation,
  // and the stock delta adjustment all happen server-side now
  // (app/api/orders/[id]/route.js PATCH).
  const handleUpdateOrder = async (orderId) => {
    const totalQty = Object.values(editQtys).reduce((sum, q) => sum + (q || 0), 0);
    if (totalQty === 0) {
      showToast("At least one item must have quantity > 0");
      return;
    }
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qtyUpdates: editQtys }) });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Error updating order"); return; }
      setEditingOrderId(null);
      setEditQtys({});
      await loadOrders();
      await loadInventory();
      showToast("Order updated");
    } catch (e) {
      logError("handleUpdateOrder", e.message || e);
      showToast("Error updating order");
    }
  };

  const repeatOrder = (order) => {
    const newQtys = {};
    order.lines.forEach(l => { newQtys[l.sku] = l.qty; });
    setQuantities(newQtys);
    setBuyer({...order.buyer});
    setOrderNumber(generateOrderNumber());
    if (order.promoCode) {
      const promo = promoCodes.find(p => p.code === order.promoCode);
      if (promo) { setAppliedPromo(promo); setPromoCode(order.promoCode); }
    }
    setView("checkout");
    showToast("Order duplicated — review and confirm");
  };

  // isAdminView is no longer trusted for authorship — the server derives it
  // from the verified session role — the param is kept only so existing
  // call sites (NoteSection) don't need to change.
  const addNote = async (orderId) => {
    const text = (noteInputs[orderId] || "").trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Failed to add note"); return; }
      setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, notes: [...(o.notes||[]), data.note]} : o));
      setNoteInputs(n => ({...n, [orderId]: ""}));
      showToast("Note added");
    } catch (e) {
      logError("addNote", e.message || e);
      showToast("Failed to add note");
    }
  };

  const exportCSV = () => {
    const rows = [["Order ID","Date","Company","Email","Country","VAT Number","Items","Subtotal","VAT","Shipping","Total","Shipping Invoice","Status","Promo Code","Cancelled"]];
    allOrders.forEach(o => {
      const items = o.lines.map(l => `${l.product} ${l.size} x${l.qty}`).join("; ");
      const statusStr = ORDER_STATUSES.filter(s => o.statuses[s.key]).map(s => s.label).join(", ");
      rows.push([o.id, new Date(o.date).toLocaleDateString("en-GB"), o.buyer.company, o.buyer.email, o.buyer.country, o.buyer.vat||"", items, o.totalWSP.toFixed(2), o.vatAmount.toFixed(2), o.shipping.toFixed(2), o.totalWithVat.toFixed(2), o.depositAmount.toFixed(2), statusStr, o.promoCode||"", o.cancelled?"Yes":"No"]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `dee-b2b-orders-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast("CSV exported");
  };

  // Sends just the orderId — the server re-fetches the order and derives
  // every field itself, rather than trusting a client-built payload.
  const handlePrint = async () => {
    const invType = invoiceViewType || "deposit";
    const orderId = viewingOrderId || orderNumber;
    try {
      const res = await fetch("/api/generate-invoice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, type: invType, format: "download" }) });
      if (!res.ok) { logError("handlePrint", `HTTP ${res.status}`); showToast("PDF generation failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${orderId}-${invType}-invoice.pdf`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { logError("handlePrint", e.message || e); showToast("Failed to generate PDF"); }
  };

  const savePromoCode = async () => {
    if (!adminPromoForm.code.trim()) { showToast("Code required"); return; }
    if (!adminPromoForm.label.trim()) { showToast("Label required"); return; }
    try {
      const res = await fetch("/api/promo-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: adminPromoForm.code, label: adminPromoForm.label, prices: adminPromoForm.prices }) });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Failed to save promo code"); return; }
      setAdminPromoForm({ code: "", label: "", prices: { "100 ML": "", "50 ML": "", "20 ML": "", "2 ML": "", "KIT": "" } });
      await loadPromoCodes();
      showToast("Promo code saved");
    } catch (e) {
      logError("savePromoCode", e.message || e);
      showToast("Failed to save promo code");
    }
  };

  const deletePromoCode = async (code) => {
    try {
      const res = await fetch(`/api/promo-codes?code=${encodeURIComponent(code)}`, { method: "DELETE" });
      if (!res.ok) { const data = await res.json().catch(() => ({})); showToast(data.error || "Failed to delete promo code"); return; }
      setPromoCodes(prev => prev.filter(p => p.code !== code));
      showToast("Promo code deleted");
    } catch (e) {
      logError("deletePromoCode", e.message || e);
      showToast("Failed to delete promo code");
    }
  };

  const loadSyncFailures = async () => {
    try {
      const res = await fetch("/api/admin/sync-failures");
      if (!res.ok) return;
      const { failures } = await res.json();
      setSyncFailures(failures || []);
    } catch (e) {
      logError("loadSyncFailures", e.message || e);
    }
  };

  const resolveSyncFailure = async (id) => {
    try {
      const res = await fetch("/api/admin/sync-failures", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!res.ok) { showToast("Failed to dismiss"); return; }
      setSyncFailures(prev => prev.map(f => f.id === id ? { ...f, resolved: true } : f));
    } catch (e) {
      logError("resolveSyncFailure", e.message || e);
      showToast("Failed to dismiss");
    }
  };

  const loadBuyers = async () => {
    try {
      const res = await fetch("/api/admin/buyers");
      if (!res.ok) return;
      const { buyers: list } = await res.json();
      setBuyers(list || []);
    } catch (e) {
      logError("loadBuyers", e.message || e);
    }
  };

  const inviteBuyer = async () => {
    if (!buyerManageForm.email.trim()) { showToast("Email required"); return; }
    try {
      const res = await fetch("/api/admin/buyers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buyerManageForm) });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Failed to invite buyer"); return; }
      setBuyerManageForm({ email: "", company: "" });
      await loadBuyers();
      showToast("Buyer invited — welcome email sent");
    } catch (e) {
      logError("inviteBuyer", e.message || e);
      showToast("Failed to invite buyer");
    }
  };

  const loadAdmins = async () => {
    try {
      const res = await fetch("/api/admin/admins");
      if (!res.ok) return;
      const { admins: list } = await res.json();
      setAdmins(list || []);
    } catch (e) {
      logError("loadAdmins", e.message || e);
    }
  };

  const addAdmin = async () => {
    if (!adminManageForm.email.trim()) { showToast("Email required"); return; }
    try {
      const res = await fetch("/api/admin/admins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(adminManageForm) });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Failed to add admin"); return; }
      setAdminManageForm({ email: "", company: "" });
      await loadAdmins();
      showToast("Admin added — welcome email sent");
    } catch (e) {
      logError("addAdmin", e.message || e);
      showToast("Failed to add admin");
    }
  };

  const removeAdmin = (id) => {
    askConfirm({
      title: "Remove Admin Access",
      message: "This account will lose admin access and become a regular buyer account.",
      confirmLabel: "Remove",
      danger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) { showToast(data.error || "Failed to remove admin"); closeConfirm(); return; }
          setAdmins(prev => prev.filter(a => a.id !== id));
          closeConfirm();
          showToast("Admin access removed");
        } catch (e) {
          logError("removeAdmin", e.message || e);
          showToast("Failed to remove admin");
          closeConfirm();
        }
      }
    });
  };

  useEffect(() => {
    if (view === "admin" || view === "myorders") loadOrders();
    if (view === "admin") loadAdmins();
    if (view === "admin") loadBuyers();
    if (view === "admin") loadSyncFailures();
    if (view === "catalog") loadInventory();
  }, [view]);

  if (loading) return (
    <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{textAlign:"center"}}>
        <Logo style={{ height: 28, opacity: 0.3 }} />
        <div style={{fontSize:11,color: "#999",marginTop:16,letterSpacing:"0.1em",textTransform:"uppercase"}}>Loading...</div>
      </div>
    </div>
  );

  if (view === "landing") return <LandingView setView={setView} />;

  if (view === "register") return <AuthScreen title="New Account" fields={[<div key="co"><label style={labelStyle}>Company Name *</label><input className="da-input" style={inputStyle} value={authForm.company} onChange={e=>setAuthForm({...authForm,company:e.target.value})} placeholder="Your company"/></div>,<div key="em"><label style={labelStyle}>Email *</label><input className="da-input" style={inputStyle} type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="name@company.com"/></div>]} onSubmit={handleRegister} submitLabel="Create Account" altText="Already have an account?" altAction={()=>setView("login")} altLabel="Sign In" authError={authError} onBack={()=>setView("landing")} />;

  if (view === "login") return <AuthScreen title="Sign In" fields={[<div key="em"><label style={labelStyle}>Email *</label><input className="da-input" style={inputStyle} type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="name@company.com"/></div>,<div key="msg" style={{fontSize:11,color: "#666",lineHeight:1.6}}>We'll email you a 6-digit code — no password needed.</div>]} onSubmit={handleRequestOtp} submitLabel="Send Code" altText="Need an account?" altAction={()=>setView("register")} altLabel="Create one" authError={authError} onBack={()=>setView("landing")} />;

  if (view === "otp") return <AuthScreen title="Enter Your Code" fields={[<div key="msg" style={{fontSize:12,color: "#888",textAlign:"center",lineHeight:1.7,marginBottom:4}}>We sent a 6-digit code to<br/><span style={{color:"#fff",fontWeight:500}}>{otpEmail}</span></div>,<div key="code"><label style={labelStyle}>Code *</label><input className="da-input" style={{...inputStyle,fontSize:22,letterSpacing:"0.3em",textAlign:"center"}} inputMode="numeric" maxLength={6} value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000"/></div>,<div key="resend" style={{textAlign:"center"}}><button onClick={handleRequestOtp} style={{background:"none",border:"none",fontSize:11,color: "#666",cursor:"pointer",fontFamily:"inherit"}}>Resend code</button></div>]} onSubmit={handleVerifyOtp} submitLabel="Verify & Sign In" authError={authError} onBack={()=>setView("landing")} />;

  if (view === "adminlogin") return <AuthScreen title="Admin Access" fields={[<div key="em"><label style={labelStyle}>Email *</label><input className="da-input" style={inputStyle} type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="name@company.com"/></div>,<div key="msg" style={{fontSize:11,color: "#666",lineHeight:1.6}}>We'll email you a 6-digit code — no password needed.</div>]} onSubmit={handleRequestOtp} submitLabel="Send Code" authError={authError} onBack={()=>setView("landing")} />;

  if (view === "profile") return (
    <ProfileView
      session={session} view={view} setView={setView} currentUser={currentUser} handleLogout={handleLogout}
      buyer={buyer} setBuyer={setBuyer} saveProfile={saveProfile} showToast={showToast} toast={toast} hideToast={hideToast}
    />
  );

  if (view === "catalog") return (
    <CatalogView
      session={session} view={view} setView={setView} currentUser={currentUser} handleLogout={handleLogout}
      inventory={inventory} getQty={getQty} setQty={setQty} getStock={getStock}
      totalItems={totalItems} totalWSP={totalWSP}
      toast={toast} hideToast={hideToast}
    />
  );

  if (view === "checkout") return (
    <CheckoutView
      session={session} view={view} setView={setView} currentUser={currentUser} handleLogout={handleLogout}
      buyer={buyer} setBuyer={setBuyer} vatInfo={vatInfo}
      promoCodeInput={promoCodeInput} setPromoCodeInput={setPromoCodeInput} applyPromoCode={applyPromoCode} appliedPromo={appliedPromo} promoError={promoError}
      orderLines={orderLines} totalWSP={totalWSP} vatAmount={vatAmount} shippingAmount={shippingAmount} totalWithVat={totalWithVat} depositInvoiceTotal={depositInvoiceTotal}
      submitting={submitting} orderNumber={orderNumber} askConfirm={askConfirm} closeConfirm={closeConfirm} confirm={confirm} handleSubmitOrder={handleSubmitOrder}
      toast={toast} hideToast={hideToast}
    />
  );

  if (view === "myorders") return (
    <MyOrdersView
      session={session} view={view} setView={setView} currentUser={currentUser} handleLogout={handleLogout}
      allOrders={allOrders} editingOrderId={editingOrderId} setEditingOrderId={setEditingOrderId} editQtys={editQtys} setEditQtys={setEditQtys} getStock={getStock}
      handleUpdateOrder={handleUpdateOrder} handleViewInvoice={handleViewInvoice} repeatOrder={repeatOrder} toggleOrderStatus={toggleOrderStatus} canClientCancel={canClientCancel} cancelOrder={cancelOrder}
      toast={toast} hideToast={hideToast} confirm={confirm} closeConfirm={closeConfirm}
    />
  );

  if (view === "admin") return (
    <AdminView
      setView={setView} currentUser={currentUser} handleLogout={handleLogout}
      adminExpanded={adminExpanded} setAdminExpanded={setAdminExpanded}
      promoCodes={promoCodes} adminPromoForm={adminPromoForm} setAdminPromoForm={setAdminPromoForm} savePromoCode={savePromoCode} deletePromoCode={deletePromoCode}
      inventory={inventory} setInventory={setInventory} saveInventory={saveInventory}
      buyers={buyers} buyerManageForm={buyerManageForm} setBuyerManageForm={setBuyerManageForm} inviteBuyer={inviteBuyer}
      admins={admins} adminManageForm={adminManageForm} setAdminManageForm={setAdminManageForm} addAdmin={addAdmin} removeAdmin={removeAdmin} session={session}
      syncFailures={syncFailures} resolveSyncFailure={resolveSyncFailure}
      errorLog={errorLog} setErrorLog={setErrorLog} showToast={showToast}
      allOrders={allOrders} adminCompanyFilter={adminCompanyFilter} setAdminCompanyFilter={setAdminCompanyFilter} adminStatusFilter={adminStatusFilter} setAdminStatusFilter={setAdminStatusFilter} exportCSV={exportCSV}
      editingOrderId={editingOrderId} setEditingOrderId={setEditingOrderId} editQtys={editQtys} setEditQtys={setEditQtys} getStock={getStock} handleUpdateOrder={handleUpdateOrder}
      toggleOrderStatus={toggleOrderStatus} handleViewInvoice={handleViewInvoice} cancelOrder={cancelOrder} restoreOrder={restoreOrder} deleteOrder={deleteOrder}
      noteInputs={noteInputs} setNoteInputs={setNoteInputs} addNote={addNote}
      toast={toast} hideToast={hideToast} confirm={confirm} closeConfirm={closeConfirm}
    />
  );

  if (view === "invoice") return (
    <InvoiceView
      viewingOrderId={viewingOrderId} orderNumber={orderNumber} allOrders={allOrders} buyer={buyer} orderLines={orderLines}
      totalWSP={totalWSP} vatInfo={vatInfo} vatAmount={vatAmount} shippingAmount={shippingAmount} totalWithVat={totalWithVat} depositAmount={depositAmount} depositInvoiceTotal={depositInvoiceTotal} totalBeforeShipping={totalBeforeShipping}
      invoiceSource={invoiceSource} invoiceViewType={invoiceViewType} setInvoiceViewType={setInvoiceViewType} invoiceRef={invoiceRef}
      setView={setView} setViewingOrderId={setViewingOrderId} setInvoiceSource={setInvoiceSource} setQuantities={setQuantities} setOrderNumber={setOrderNumber} setPromoCode={setPromoCode} setAppliedPromo={setAppliedPromo}
      handlePrint={handlePrint}
    />
  );

  return null;
}
