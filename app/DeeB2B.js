"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { PRODUCTS, shippingRateFor } from "@/lib/products";
import { getVatInfo } from "@/lib/vat";
import { splitShipping } from "@/lib/pricing";
import { normalizeCountry } from "@/lib/countries";
import { SELLER } from "@/lib/seller";
import {
  base, useStyleInjection, ORDER_STATUSES,
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
  const otpInputRef = useRef(null);
  const [admins, setAdmins] = useState([]);
  const [adminManageForm, setAdminManageForm] = useState({ email: "", company: "" });
  const [buyers, setBuyers] = useState([]);
  const [syncFailures, setSyncFailures] = useState([]);
  const [buyerManageForm, setBuyerManageForm] = useState({ email: "", company: "" });
  const [adminExpanded, setAdminExpanded] = useState(null);
  const [adminCompanyFilter, setAdminCompanyFilter] = useState(null);
  const [adminStatusFilter, setAdminStatusFilter] = useState("all");
  const [allOrders, setAllOrders] = useState([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [quantities, setQuantities] = useState({});
  const [view, setView] = useState("landing");
  const [buyer, setBuyer] = useState({ company:"",address:"",city:"",country:"",zip:"",vat:"",email:"",contact:"" });
  const [viewingOrderId, setViewingOrderId] = useState(null);
  const pendingDeepOrder = useRef(null);
  const profileLoaded = useRef(false);
  const viewRef = useRef(view);
  const [invoiceSource, setInvoiceSource] = useState(null);
  const [invoiceViewType, setInvoiceViewType] = useState("deposit"); // "deposit" or "balance"

  const [authBusy, setAuthBusy] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);
  // Order failures stay on the checkout instead of flashing past in a toast.
  const [submitError, setSubmitError] = useState("");
  // No hardcoded fallback: a phantom promo the server won't honor would let a
  // buyer confirm a discounted total and then be invoiced full price.
  const [promoCodes, setPromoCodes] = useState([]);
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
  const [inventorySaved, setInventorySaved] = useState({});
  const [inventoryLoaded, setInventoryLoaded] = useState(false);
  // Distinguishes "stock hasn't arrived yet" from "stock failed to arrive" —
  // the catalogue used to render both as a normal page with no badges.
  const [inventoryError, setInventoryError] = useState(false);
  // Unsaved admin edits shouldn't be silently wiped by a background reload,
  // and the admin should be able to see that they're unsaved.
  const inventoryDirty = JSON.stringify(inventory) !== JSON.stringify(inventorySaved);
  // loadInventory runs inside async callbacks that closed over an older render.
  const inventoryDirtyRef = useRef(inventoryDirty);
  useEffect(() => { inventoryDirtyRef.current = inventoryDirty; }, [inventoryDirty]);

  const getQty = (sku) => quantities[sku] || 0;
  // null means "not known yet" (still loading, or the fetch failed). A loaded
  // catalogue with no row for a SKU means zero — that SKU is not stocked, and
  // POST /api/orders now refuses it for the same reason.
  const getStock = (sku) => {
    if (!inventoryLoaded) return null;
    const s = inventory[sku];
    return (s !== undefined && s !== null) ? s : 0;
  };
  const setQty = (sku, val) => {
    const stock = getStock(sku);
    // Never clamp below what is already in the cart: if stock ran out while
    // the buyer was shopping, the line has to stay visible and reducible
    // rather than becoming an invisible item that blocks checkout.
    const ceiling = stock === null ? Infinity : Math.max(stock, quantities[sku] || 0);
    setQuantities((q) => ({ ...q, [sku]: Math.min(Math.max(0, val), ceiling) }));
  };

  const orderLines = [];
  let totalWSP = 0;
  PRODUCTS.forEach((p) => p.variants.forEach((v) => {
    const qty = getQty(v.sku);
    if (qty > 0) {
      // Mirrors lib/pricing.js: only a real positive number overrides the
      // catalog price, so an empty-string or 0 promo entry can't zero a line.
      const promoPrice = appliedPromo?.discount_type === "fixed_prices" ? Number(appliedPromo.prices?.[v.size]) : NaN;
      const unitPrice = Number.isFinite(promoPrice) && promoPrice > 0 ? promoPrice : v.wsp;
      orderLines.push({product:p.name,size:v.size,sku:v.sku,ean:v.ean,qty,unitPrice,total:qty*unitPrice});
      totalWSP += qty*unitPrice;
    }
  }));

  // Checkout preview only — lib/pricing.js runs the same arithmetic server-side
  // and that is what actually gets stored. Kept deliberately identical so the
  // total the buyer confirms is the total they are invoiced.
  const vatInfo = getVatInfo(buyer.country, buyer.vat);
  const goodsVatAmount = Math.round(totalWSP * vatInfo.rate * 100) / 100;
  const totalItems = orderLines.reduce((s,l) => s+l.qty, 0);
  // Shipping is quoted VAT-inclusive and varies by destination; splitShipping
  // pulls out the net line and the VAT hiding inside it.
  const shipping = totalItems > 0 ? splitShipping(shippingRateFor(buyer.country), vatInfo.rate) : splitShipping(0, 0);
  const shippingAmount = shipping.net;
  const vatAmount = Math.round((goodsVatAmount + shipping.vat) * 100) / 100;
  // No 30/70 split — first invoice is shipping only (gross), second is the full
  // order value (goods + goods VAT).
  const depositAmount = shipping.gross;
  const depositInvoiceTotal = depositAmount;
  const totalBeforeShipping = Math.round((totalWSP + goodsVatAmount) * 100) / 100;
  const totalWithVat = Math.round((totalBeforeShipping + depositAmount) * 100) / 100;

  useEffect(() => { viewRef.current = view; }, [view]);
  // Otherwise a rejection from ten minutes ago is waiting on the summary the
  // next time the buyer opens the checkout.
  useEffect(() => { if (view !== "checkout") setSubmitError(""); }, [view]);

  // Typed-but-unsaved stock is the one thing in the admin panel that only
  // exists in this tab.
  useEffect(() => {
    if (!inventoryDirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [inventoryDirty]);

  useEffect(() => {
    // Check URL params for deep linking from emails.
    const params = new URLSearchParams(window.location.search);
    const deepOrder = params.get("order");
    if (deepOrder) pendingDeepOrder.current = deepOrder;
    // Which of the order's two invoices the email was actually about. Without
    // this the "View invoice" button on a €410 full invoice opened the €35
    // shipping invoice, because the view always defaulted to deposit.
    if (params.get("invoice") === "balance") setInvoiceViewType("balance");

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

  // Inventory is public (stock badges on the catalogue). Promo codes are NOT —
  // they only load once we know the session is an admin, which the admin-view
  // effect below handles.
  // Stock needs a session now, so load it when one appears rather than on mount.
  useEffect(() => {
    if (session) loadInventory();
  }, [session]);

  // Admin-only now: this returns every code WITH its price table, so it must
  // never be fetched for ordinary visitors. It used to run on mount for
  // everyone, which put the full discount list in any anonymous visitor's
  // Network tab. Buyers validate a single code they already know instead —
  // see applyPromoCode.
  const loadPromoCodes = async () => {
    try {
      const res = await fetch("/api/promo-codes");
      if (res.status === 401 || res.status === 403) { setPromoCodes([]); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { promoCodes: data } = await res.json();
      setPromoCodes(data || []);
    } catch (e) {
      logError("loadPromoCodes", e.message || e);
      setPromoCodes([]);
    }
  };

  // Feature 3: Load and save inventory
  const loadInventory = async (force = false) => {
    try {
      const res = await fetch("/api/inventory");
      // Anonymous visitors on the landing page get a 401 now that stock is
      // behind a login — that is expected, not an error worth logging.
      if (res.status === 401) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { inventory: rows } = await res.json();
      const inv = {};
      (rows || []).forEach((row) => { inv[row.sku] = row.stock; });
      // Never overwrite unsaved admin edits with a background reload: cancelling
      // an order, saving an edit or placing an order all call loadInventory(),
      // and each of those would silently revert numbers the admin had typed —
      // and, because `inventoryDirty` is derived, disarm the unload guard with
      // them. `force` is for the two callers that genuinely want the server's
      // truth: the retry button and the stale-snapshot 409.
      if (force || !inventoryDirtyRef.current) setInventory(inv);
      setInventorySaved(inv);
      setInventoryLoaded(true);
      setInventoryError(false);
    } catch (e) {
      logError("loadInventory", e.message || e);
      // Deliberately keep whatever was last loaded rather than wiping to {}:
      // an empty map renders every admin input as 0, and one "Save All" click
      // would then zero the entire live catalogue.
      setInventoryLoaded(false);
      setInventoryError(true);
    }
  };

  const saveInventory = async () => {
    if (!inventoryLoaded) { showToast("Inventory not loaded — refresh before saving"); return; }
    try {
      // Send what this page believed each SKU held when it loaded, so the
      // server can refuse a row that moved since. Sending only the new value
      // meant an order placed while the panel sat open was silently undone:
      // every untouched SKU got rewritten to its stale figure on Save All.
      const records = [];
      let blank = null;
      PRODUCTS.forEach(p => {
        p.variants.forEach(v => {
          // Blur restores a cleared field, so a null here means focus is still
          // in it. Skipping it silently while the toast says "saved" is exactly
          // the lie this whole pass is about — bail instead.
          if (inventory[v.sku] === null) { blank = `${p.name} ${v.size}`; return; }
          records.push({
            sku: v.sku,
            product_name: p.name,
            size: v.size,
            stock: inventory[v.sku] || 0,
            previousStock: inventorySaved[v.sku] === undefined ? null : inventorySaved[v.sku],
          });
        });
      });
      if (blank) { showToast(`${blank} is empty — type a number (0 to clear the stock)`); return; }
      const res = await fetch("/api/inventory", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records }) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        // A stale-snapshot conflict is not an error the admin caused — reload
        // so the screen shows the truth instead of leaving them staring at
        // numbers the server just rejected.
        if (res.status === 409 && d.conflicts) { showToast(d.error); await loadInventory(true); return; }
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setInventorySaved({ ...inventory });
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
      // Country is normalized on the way in so a profile saved before the
      // picker existed ("Danmark", "Deutschland") selects the right entry
      // instead of reading as blank. Unresolvable values pass through
      // untouched — CountrySelect shows them and asks for a reselect.
      const mapped = { company: data.company||"", contact: data.contact||"", address: data.address||"", city: data.city||"", country: normalizeCountry(data.country) || data.country || "", zip: data.zip||"", vat: data.vat||"", email: data.email||"" };
      setBuyer(mapped);
      profileLoaded.current = true;
      return mapped;
    } catch (e) {
      logError("loadProfile", e.message || e);
      return null;
    }
  };

  // A failed load used to `return` in silence: `allOrders` stayed `[]`,
  // `ordersLoaded` stayed false, and My Orders rendered "No orders yet. Start
  // shopping" — telling an active buyer they had never ordered anything, and
  // inviting them to place the order again.
  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { orders } = await res.json();
      setAllOrders(orders || []);
      setOrdersLoaded(true);
      setOrdersError(false);
    } catch (e) {
      logError("loadOrders", e.message || e);
      setOrdersError(true);
    } finally {
      setOrdersLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!session) return false;
    try {
      const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buyer) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (e) {
      logError("saveProfile", e.message || e);
      return false;
    }
  };

  const handleRequestOtp = async () => {
    if (authBusy) return;
    setAuthError("");
    if (!authForm.email) { setAuthError("Enter your email address"); return; }
    setAuthBusy(true);
    try {
      const res = await fetch("/api/auth/request-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authForm.email }) });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || "Something went wrong"); return; }
      setOtpEmail(data.email);
      setView("otp");
      showToast("Code sent — check your email");
    } catch (e) {
      setAuthError("Something went wrong");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (authBusy) return;
    setAuthError("");
    if (!otpCode || otpCode.trim().length !== 6) { setAuthError("Enter the 6-digit code"); return; }
    setAuthBusy(true);
    try {
      const res = await fetch("/api/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: otpEmail, code: otpCode.trim() }) });
      const data = await res.json();
      if (!res.ok) {
        // Clear the rejected digits and put the cursor back: under a visible
        // attempt counter, making them delete six characters by hand is
        // friction at exactly the wrong moment.
        setAuthError(data.error || "Verification failed");
        setOtpCode("");
        if (otpInputRef.current) otpInputRef.current.focus();
        return;
      }
      setSession({ id: data.id, email: data.email, role: data.role });
      setOtpCode(""); setOtpEmail(""); setAuthForm({company:"",email:""});
      const profile = await loadProfile();
      await loadOrders();
      // Someone who clicked an email CTA and had to sign in first should land
      // on that order, not be dumped on the catalogue with the link lost.
      if (pendingDeepOrder.current) {
        setViewingOrderId(pendingDeepOrder.current);
        setInvoiceSource("myorders");
        setView("invoice");
        pendingDeepOrder.current = null;
      } else {
        setView(data.role === "admin" ? "admin" : "catalog");
      }
      showToast("Welcome" + (profile?.company ? ", " + profile.company : ""));
    } catch (e) {
      setAuthError("Verification failed");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    // Unsaved stock only exists in this tab; signing out threw it away without
    // a word.
    if (inventoryDirty) {
      askConfirm({
        title: "Unsaved stock changes",
        message: "The inventory edits on this page haven't been saved. Signing out discards them.",
        confirmLabel: "Discard and sign out",
        cancelLabel: "Go back",
        danger: true,
        onConfirm: () => { closeConfirm(); doLogout(); },
      });
      return;
    }
    return doLogout();
  };

  const doLogout = async () => {
    // Only persist if a profile was actually loaded into the form — otherwise
    // signing out from a screen that never populated `buyer` would blank the
    // saved profile.
    if (profileLoaded.current) await saveProfile();
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch (e) {}
    setSession(null); setQuantities({}); setView("landing");
    setBuyer({company:"",address:"",city:"",country:"",zip:"",vat:"",email:"",contact:""});
    profileLoaded.current = false;
    setAppliedPromo(null);
  };

  // Asks the server about ONE code. Deliberately not a lookup in a local list:
  // holding every code client-side is what leaked the whole discount table.
  // The server also re-validates at order time, so this is a preview, not the
  // authority.
  const applyPromoCode = async () => {
    setPromoError("");
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) { setPromoError("Enter a promo code"); return; }
    try {
      const res = await fetch("/api/promo-codes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) { setPromoError(data.error || "Invalid code"); return; }
      setAppliedPromo(data.promo);
      // No toast: the checkout already confirms this inline, right under the
      // field, and two identical confirmations for one action read as a bug.
      setPromoCodeInput("");
    } catch (e) {
      logError("applyPromoCode", e.message || e);
      setPromoError("Couldn't check that code — try again");
    }
  };

  const clearPromo = () => { setAppliedPromo(null); setPromoError(""); setPromoCodeInput(""); };

  const handleSubmitOrder = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const items = orderLines.map(l => ({ sku: l.sku, qty: l.qty }));
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `expectedTotal` is the figure the buyer just confirmed on screen. The
        // server re-derives everything itself and refuses if the two disagree,
        // which closes the whole class of "confirmed one price, invoiced
        // another" — a promo whose prices were edited between applying it and
        // submitting, a catalogue price change, a shipping-rate change, or
        // simply a page left open overnight.
        body: JSON.stringify({ items, buyer, promoCode: appliedPromo?.code || null, expectedTotal: totalWithVat }),
      });
      const data = await res.json();
      if (!res.ok) {
        logError("handleSubmitOrder", data.error);
        // Deliberately NOT a toast. This is the most expensive click in the
        // app: the message has to stay on screen, be readable, and be
        // selectable so it can be pasted into an email to Dorte.
        if (res.status === 409 && data.priceChanged) {
          // A price mismatch means this page is out of date — refresh the
          // things it prices from so the retry shows the real numbers, and say
          // that the promo went with them rather than dropping it silently.
          await loadInventory();
          setAppliedPromo(null);
          setSubmitError(`${data.error || "Prices changed while you were checking out."} The promo code was removed — re-apply it if it still valid.`);
        } else {
          setSubmitError(data.error || "The order couldn't be placed. Nothing was charged — try again, or send this to " + SELLER.email + ".");
        }
        return;
      }
      setSubmitError("");

      await loadOrders();
      await loadInventory();
      const placedOrderId = data.order.id;
      setViewingOrderId(placedOrderId);
      setInvoiceSource("buyer");
      // A newly placed order is always shown as its SHIPPING invoice — that is
      // the document that was just emailed and the only one due. Without this
      // reset the view kept whatever type was last opened, so a buyer who had
      // looked at an old full invoice saw their new order presented as a demand
      // for the entire order value.
      setInvoiceViewType("deposit");
      setView("invoice");
      showToast("Order placed — " + placedOrderId);
      setQuantities({});
      setAppliedPromo(null);
    } catch (e) {
      logError("handleSubmitOrder", e.message || e);
      setSubmitError("The order couldn't be sent — check your connection and try again. Nothing was charged.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewInvoice = (orderId, source, invType = "deposit") => { setViewingOrderId(orderId); setInvoiceSource(source); setInvoiceViewType(invType); setView("invoice"); };

  // Status toggling, email dispatch, and PDF generation are all handled
  // server-side now (app/api/orders/[id]/status/route.js) — this just
  // reflects the confirmed new statuses back into local state.
  const doToggleStatus = async (orderId, key) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
      const data = await res.json();
      if (!res.ok) {
        logError("toggleOrderStatus:" + key, data.error);
        // 409 means someone else (or a double-click) already changed this
        // status. The server message says so on its own, and the local view is
        // now stale — reload rather than leaving two admins looking at
        // different states.
        if (res.status === 409) { showToast(data.error || "That status was just changed elsewhere"); loadOrders(); return; }
        showToast("Failed to update status — " + (data.error || ""));
        return;
      }
      setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, statuses: data.statuses} : o));
      // The response only carries statuses, so the order's `economic` block is
      // now stale — and for an invoice status it's stale in the worst way: the
      // e-conomic sync is fire-and-forget, so the badge would sit on "sending…"
      // (or "not sent", pre-toggle) indefinitely and invite a re-toggle of an
      // invoice that did go out. Reload once the sync has had time to land.
      if (key === "deposit_invoiced" || key === "balance_invoiced") {
        setTimeout(loadOrders, 3000);
      }
    } catch (e) {
      logError("toggleOrderStatus:" + key, e.message || e);
      showToast("Failed to update status");
    }
  };

  // Turning an invoice status ON emails the buyer a real invoice PDF, and
  // balance_invoiced also pushes a draft into Dorte's live e-conomic account.
  // The status pills sit 6px apart with a hover scale — one misclick shouldn't
  // be able to do that. Turning a status OFF sends nothing, so it stays instant.
  // `turningOn` is read from the client's copy of the order, which can be
  // minutes old — another admin (or the same person in another tab) may have
  // moved it since. The server's compare-and-swap catches a genuine conflict
  // and answers 409, and doToggleStatus reloads on that, so the worst case is
  // a wasted click rather than a wrong email. What must NOT happen is deciding
  // to skip the confirmation dialog off stale state: that is how "Send Invoice"
  // silently became "un-invoice", and the next click then emailed the buyer a
  // second copy.
  // What each status actually does to the buyer when it is switched ON. Every
  // one of them sends a real email the moment it is clicked, and there is no
  // undo — a mis-aimed click on a 7-chip row told a buyer their order had
  // shipped. Only the buyer's own "Confirm receipt" skips the prompt, because
  // there the buyer is the one being told.
  const STATUS_EFFECT = {
    deposit_invoiced: { title: "Send the shipping invoice?", body: (o) => `${o} — this emails the buyer the shipping invoice PDF and files a draft in e-conomic.`, label: "Send invoice" },
    deposit_paid:     { title: "Mark the shipping fee as paid?", body: (o) => `${o} — this emails the buyer a payment confirmation.`, label: "Mark paid" },
    packed:           { title: "Mark this order as packed?", body: (o) => `${o} — this emails the buyer that the order is packed.`, label: "Mark packed" },
    balance_invoiced: { title: "Send the full invoice?", body: (o) => `${o} — this emails the buyer the full invoice PDF and files a draft in e-conomic.`, label: "Send invoice" },
    balance_paid:     { title: "Mark the order as paid in full?", body: (o) => `${o} — this emails the buyer a payment confirmation.`, label: "Mark paid" },
    shipped:          { title: "Mark this order as shipped?", body: (o) => `${o} — this emails the buyer that the order is on its way.`, label: "Mark shipped" },
    received:         { title: "Mark this order as received?", body: (o) => `${o} — this closes the order.`, label: "Mark received" },
  };

  const toggleOrderStatus = (orderId, key, opts = {}) => {
    const order = allOrders.find(o => o.id === orderId);
    const turningOn = order && !order.statuses[key];
    const effect = STATUS_EFFECT[key];
    if (turningOn && effect && !opts.skipConfirm) {
      askConfirm({
        title: effect.title,
        message: effect.body(`${orderId} · ${order.buyer?.company || "buyer"}`),
        confirmLabel: effect.label,
        cancelLabel: "Not yet",
        onConfirm: async () => { closeConfirm(); await doToggleStatus(orderId, key); },
      });
      return;
    }
    return doToggleStatus(orderId, key);
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

  // `force` skips the server's e-conomic guard. Only ever reached through the
  // second confirmation below, once the drafts have actually been dealt with.
  const deleteOrder = (orderId, force = false) => {
    askConfirm({
      title: force ? "Delete Anyway" : "Delete Order Permanently",
      message: force
        ? `Only continue if those drafts are already deleted in e-conomic. Deleting order ${orderId} here removes the last record of which drafts belonged to it.`
        : `This will permanently delete order ${orderId}. This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Keep it",
      danger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/orders/${orderId}${force ? "?force=1" : ""}`, { method: "DELETE" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            logError("deleteOrder", data.error);
            // The e-conomic refusal is actionable advice, not a failure. Swap
            // the open modal for the override rather than leaving a dead end —
            // the drafts have to be deleted in e-conomic by hand, and once that
            // is done there has to be a way to finish the job here.
            if (data.economicDrafts && !force) {
              askConfirm({
                title: "Still In e-conomic",
                message: data.error,
                confirmLabel: "I've deleted them",
                danger: true,
                onConfirm: () => { closeConfirm(); deleteOrder(orderId, true); },
              });
              return;
            }
            showToast("Failed to delete — " + (data.error || ""));
            closeConfirm();
            return;
          }
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
      title: "Cancel this order?",
      message: fromAdmin
        ? `Order ${orderId} will be cancelled and its stock returned. You can restore it afterwards.`
        : `Order ${orderId} will be cancelled and its stock returned. Contact us if you need it reinstated.`,
      // Both buttons used to begin with the word "Cancel", and the destructive
      // one was the red fill — so reading only the first word cancelled a real
      // order.
      cancelLabel: "Keep order",
      confirmLabel: "Cancel order",
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
    // `setQuantities(newQtys)` REPLACES the cart, so a half-built basket would
    // vanish without a word.
    if (Object.values(quantities).some((q) => q > 0)) {
      askConfirm({
        title: "Replace what's in your cart?",
        message: `Repeating ${order.id} replaces the items currently in your cart.`,
        confirmLabel: "Replace cart",
        cancelLabel: "Keep my cart",
        onConfirm: () => { closeConfirm(); doRepeatOrder(order); },
      });
      return;
    }
    doRepeatOrder(order);
  };

  const doRepeatOrder = (order) => {
    // Clamp to current stock at duplication time — prefilling quantities that
    // are no longer available just guarantees a rejection at submit.
    const newQtys = {};
    let adjusted = false;
    order.lines.forEach(l => {
      const stock = getStock(l.sku);
      const q = stock !== null ? Math.min(l.qty, stock) : l.qty;
      if (q !== l.qty) adjusted = true;
      if (q > 0) newQtys[l.sku] = q;
    });
    if (Object.keys(newQtys).length === 0) {
      showToast("Items from this order are currently out of stock");
      return;
    }
    setQuantities(newQtys);
    // Deliberately does NOT overwrite `buyer`. It used to copy the historical
    // order's snapshot over the live profile — so repeating a two-year-old
    // order silently restored that address, and the logout auto-save then
    // persisted it. The current profile is the buyer's own, already loaded, and
    // checkout is where they change it if they want to.
    if (order.promoCode) {
      // The client no longer holds the code table (it was public and leaked),
      // so re-validate against the server, which is the authority anyway.
      fetch("/api/promo-codes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: order.promoCode }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.promo) setAppliedPromo(d.promo); })
        .catch(() => {});
    }
    setView("checkout");
    showToast(adjusted ? "Order duplicated — quantities adjusted to current stock" : "Order duplicated — review and confirm");
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

  // Exports whatever the admin is currently looking at (AdminView passes its
  // filtered list), not always the full set — exporting 200 rows when the
  // screen shows 3 is never what was meant.
  const exportCSV = (list) => {
    const rows = [["Order ID","Date","Company","Email","Country","VAT Number","Items","Subtotal","VAT","Shipping (excl. VAT)","Total","Shipping Invoice (incl. VAT)","Full Invoice","Status","Promo Code","Cancelled"]];
    const money = (n) => (Number(n) || 0).toFixed(2);
    (list || allOrders).forEach(o => {
      const items = o.lines.map(l => `${l.product} ${l.size} x${l.qty}`).join("; ");
      const statusStr = ORDER_STATUSES.filter(s => o.statuses[s.key]).map(s => s.label).join(", ");
      // Display-only normalization. `orders.buyer_country` is deliberately
      // never rewritten (it's the record of what was invoiced), so the column
      // otherwise mixes "Danmark" and "Denmark" as separate values forever and
      // any group-by in Excel double-counts them.
      rows.push([o.id, new Date(o.date).toISOString().slice(0,10), o.buyer.company, o.buyer.email, normalizeCountry(o.buyer.country) || o.buyer.country || "", o.buyer.vat||"", items, money(o.totalWSP), money(o.vatAmount), money(o.shipping), money(o.totalWithVat), money(o.depositAmount), money(o.balanceAmount), statusStr, o.promoCode||"", o.cancelled?"Yes":"No"]);
    });
    // Excel and Numbers treat a cell starting with = + - or @ as a formula,
    // even inside quotes. Company names and contact fields are buyer-supplied,
    // so `=HYPERLINK(...)` typed at registration would execute when Dorte opens
    // the export. Prefixing a tab neutralises it without changing what she
    // reads. https://owasp.org/www-community/attacks/CSV_Injection
    const csvCell = (c) => {
      const s = String(c ?? "");
      const safe = /^[=+\-@\t\r]/.test(s) ? `\t${s}` : s;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const csv = rows.map(r => r.map(csvCell).join(",")).join("\n");
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
    const orderId = viewingOrderId;
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
    const SIZES = ["2 ML","20 ML","50 ML","100 ML","KIT"];
    const missingPrices = SIZES.filter(sz => {
      const n = Number(adminPromoForm.prices[sz]);
      return adminPromoForm.prices[sz] === "" || !Number.isFinite(n) || n <= 0;
    });
    if (missingPrices.length) { showToast("Valid price required for " + missingPrices.join(", ")); return; }
    if (promoCodes.some(pc => pc.code.toUpperCase() === adminPromoForm.code.trim().toUpperCase())) {
      showToast("That code already exists"); return;
    }
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

  const deletePromoCode = (code) => {
    askConfirm({
      title: "Delete Promo Code",
      message: `Delete ${code}? Its pricing table can't be recovered, and buyers won't be able to apply it to new orders.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/promo-codes?code=${encodeURIComponent(code)}`, { method: "DELETE" });
          if (!res.ok) { const data = await res.json().catch(() => ({})); showToast(data.error || "Failed to delete promo code"); return; }
          setPromoCodes(prev => prev.filter(p => p.code !== code));
          showToast("Promo code deleted");
        } catch (e) {
          logError("deletePromoCode", e.message || e);
          showToast("Failed to delete promo code");
        } finally {
          closeConfirm();
        }
      },
    });
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
      // The welcome email is the buyer's only route in now, so say which of the
      // two things actually happened.
      showToast(data.emailSent
        ? "Buyer invited — welcome email sent"
        : "Account created, but the welcome email failed to send — check Sync Failures");
    } catch (e) {
      logError("inviteBuyer", e.message || e);
      showToast("Failed to invite buyer");
    }
  };

  // Removing a buyer who has ordered deactivates the account and keeps the
  // orders; one who never ordered is deleted outright. The dialog says which,
  // because they are very different things.
  const removeBuyer = (b) => {
    const hasOrders = (b.order_count || 0) > 0;
    askConfirm({
      title: hasOrders ? "Revoke access?" : "Remove this account?",
      message: hasOrders
        ? `${b.email} will no longer be able to sign in, and any open session ends immediately. Their ${b.order_count} order${b.order_count === 1 ? "" : "s"} and invoices stay exactly as they are. You can restore access later.`
        : `${b.email} has never placed an order, so the account is deleted outright.`,
      confirmLabel: hasOrders ? "Revoke access" : "Delete account",
      cancelLabel: "Keep it",
      danger: true,
      onConfirm: async () => {
        closeConfirm();
        try {
          const res = await fetch(`/api/admin/buyers/${b.id}`, { method: "DELETE" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) { showToast(data.error || "Couldn't remove that account"); return; }
          await loadBuyers();
          showToast(data.deactivated ? `${b.email} can no longer sign in` : `${b.email} removed`);
        } catch (e) {
          logError("removeBuyer", e.message || e);
          showToast("Couldn't remove that account");
        }
      },
    });
  };

  // Re-inviting restores access rather than failing on a duplicate.
  const restoreBuyer = async (b) => {
    try {
      const res = await fetch("/api/admin/buyers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: b.email, company: b.company }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(data.error || "Couldn't restore access"); return; }
      await loadBuyers();
      showToast(data.emailSent ? `${b.email} can sign in again — welcome email sent` : `${b.email} can sign in again`);
    } catch (e) {
      logError("restoreBuyer", e.message || e);
      showToast("Couldn't restore access");
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
    if (view === "admin") loadPromoCodes();
    if (view === "catalog" && !inventoryDirty) loadInventory();
  }, [view]);

  // Each view is assigned rather than early-returned so a single Toast can
  // sit outside all of them: it used to be mounted per-view, so any toast
  // fired from the invoice or auth screens never rendered and then popped up
  // stale on the next screen that did mount one.
  let viewEl = null;

  if (loading) viewEl = (
    <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{textAlign:"center"}}>
        <Logo style={{ height: 28, opacity: 0.3 }} />
        <div style={{fontSize:11,color: "#999",marginTop:16,letterSpacing:"0.1em",textTransform:"uppercase"}}>Loading...</div>
      </div>
    </div>
  );

  else if (view === "landing") viewEl = <LandingView setView={setView} />;


  else if (view === "login") viewEl = <AuthScreen title="Sign In" fields={[<div key="em"><label style={labelStyle}>Email *</label><input className="da-input" style={inputStyle} type="email" value={authForm.email} onChange={e=>{setAuthForm({...authForm,email:e.target.value});if(authError)setAuthError("");}} placeholder="name@company.com"/></div>,<div key="msg" style={{fontSize:11,color: "#8a8a8a",lineHeight:1.6}}>We&apos;ll email you a 6-digit code — no password needed.</div>]} onSubmit={handleRequestOtp} submitLabel="Send Code" authError={authError} busy={authBusy} onBack={()=>setView("landing")} />;

  else if (view === "otp") viewEl = <AuthScreen title="Enter Your Code" fields={[<div key="msg" style={{fontSize:12,color: "#888",textAlign:"center",lineHeight:1.7,marginBottom:4}}>We sent a 6-digit code to<br/><span style={{color:"#fff",fontWeight:500}}>{otpEmail}</span></div>,<div key="code"><label style={labelStyle}>Code *</label><input className="da-input" style={{...inputStyle,fontSize:22,letterSpacing:"0.3em",textAlign:"center"}} inputMode="numeric" autoFocus autoComplete="one-time-code" maxLength={6} value={otpCode} ref={otpInputRef} onChange={e=>{setOtpCode(e.target.value.replace(/\D/g,"").slice(0,6));if(authError)setAuthError("");}} placeholder="000000"/></div>,<div key="resend" style={{textAlign:"center"}}><button type="button" onClick={handleRequestOtp} disabled={authBusy} style={{background:"none",border:"none",fontSize:11,color: "#8a8a8a",cursor:authBusy?"default":"pointer",opacity:authBusy?0.5:1,fontFamily:"inherit"}}>Resend code</button></div>]} onSubmit={handleVerifyOtp} submitLabel="Verify & Sign In" authError={authError} busy={authBusy} onBack={()=>setView("landing")} />;

  else if (view === "adminlogin") viewEl = <AuthScreen title="Admin Access" fields={[<div key="em"><label style={labelStyle}>Email *</label><input className="da-input" style={inputStyle} type="email" value={authForm.email} onChange={e=>{setAuthForm({...authForm,email:e.target.value});if(authError)setAuthError("");}} placeholder="name@company.com"/></div>,<div key="msg" style={{fontSize:11,color: "#8a8a8a",lineHeight:1.6}}>We&apos;ll email you a 6-digit code — no password needed.</div>]} onSubmit={handleRequestOtp} submitLabel="Send Code" authError={authError} busy={authBusy} onBack={()=>setView("landing")} />;

  else if (view === "profile") viewEl = (
    <ProfileView
      session={session} view={view} setView={setView} currentUser={currentUser} handleLogout={handleLogout}
      buyer={buyer} setBuyer={setBuyer} saveProfile={saveProfile} showToast={showToast}
    />
  );

  else if (view === "catalog") viewEl = (
    <CatalogView
      session={session} view={view} setView={setView} currentUser={currentUser} handleLogout={handleLogout}
      getQty={getQty} setQty={setQty} getStock={getStock}
      inventoryLoaded={inventoryLoaded} inventoryError={inventoryError} reloadInventory={loadInventory}
      totalItems={totalItems} totalWSP={totalWSP}
    />
  );

  else if (view === "checkout") viewEl = (
    <CheckoutView
      session={session} view={view} setView={setView} currentUser={currentUser} handleLogout={handleLogout}
      buyer={buyer} setBuyer={setBuyer} vatInfo={vatInfo}
      promoCodeInput={promoCodeInput} setPromoCodeInput={setPromoCodeInput} applyPromoCode={applyPromoCode} appliedPromo={appliedPromo} clearPromo={clearPromo} promoError={promoError} setPromoError={setPromoError}
      orderLines={orderLines} totalWSP={totalWSP} vatAmount={vatAmount} shippingAmount={shippingAmount} totalWithVat={totalWithVat} depositInvoiceTotal={depositInvoiceTotal}
      submitting={submitting} submitError={submitError} setSubmitError={setSubmitError} askConfirm={askConfirm} closeConfirm={closeConfirm} confirm={confirm} handleSubmitOrder={handleSubmitOrder}
    />
  );

  else if (view === "myorders") viewEl = (
    <MyOrdersView
      session={session} view={view} setView={setView} currentUser={currentUser} handleLogout={handleLogout}
      allOrders={allOrders} ordersLoaded={ordersLoaded} ordersLoading={ordersLoading} ordersError={ordersError} reloadOrders={loadOrders}
      editingOrderId={editingOrderId} setEditingOrderId={setEditingOrderId} editQtys={editQtys} setEditQtys={setEditQtys} getStock={getStock}
      handleUpdateOrder={handleUpdateOrder} handleViewInvoice={handleViewInvoice} repeatOrder={repeatOrder} toggleOrderStatus={toggleOrderStatus} canClientCancel={canClientCancel} cancelOrder={cancelOrder}
      confirm={confirm} closeConfirm={closeConfirm}
    />
  );

  else if (view === "admin") viewEl = (
    <AdminView
      setView={setView} currentUser={currentUser} handleLogout={handleLogout}
      adminExpanded={adminExpanded} setAdminExpanded={setAdminExpanded}
      promoCodes={promoCodes} adminPromoForm={adminPromoForm} setAdminPromoForm={setAdminPromoForm} savePromoCode={savePromoCode} deletePromoCode={deletePromoCode}
      inventory={inventory} inventorySaved={inventorySaved} setInventory={setInventory} saveInventory={saveInventory} inventoryLoaded={inventoryLoaded} inventoryDirty={inventoryDirty}
      buyers={buyers} buyerManageForm={buyerManageForm} setBuyerManageForm={setBuyerManageForm} inviteBuyer={inviteBuyer} removeBuyer={removeBuyer} restoreBuyer={restoreBuyer}
      admins={admins} adminManageForm={adminManageForm} setAdminManageForm={setAdminManageForm} addAdmin={addAdmin} removeAdmin={removeAdmin} session={session}
      syncFailures={syncFailures} resolveSyncFailure={resolveSyncFailure}
      errorLog={errorLog} setErrorLog={setErrorLog} showToast={showToast}
      allOrders={allOrders} ordersError={ordersError} reloadOrders={loadOrders} adminCompanyFilter={adminCompanyFilter} setAdminCompanyFilter={setAdminCompanyFilter} adminStatusFilter={adminStatusFilter} setAdminStatusFilter={setAdminStatusFilter} adminSearch={adminSearch} setAdminSearch={setAdminSearch} exportCSV={exportCSV}
      editingOrderId={editingOrderId} setEditingOrderId={setEditingOrderId} editQtys={editQtys} setEditQtys={setEditQtys} getStock={getStock} handleUpdateOrder={handleUpdateOrder}
      toggleOrderStatus={toggleOrderStatus} handleViewInvoice={handleViewInvoice} cancelOrder={cancelOrder} restoreOrder={restoreOrder} deleteOrder={deleteOrder}
      noteInputs={noteInputs} setNoteInputs={setNoteInputs} addNote={addNote}
      confirm={confirm} closeConfirm={closeConfirm}
    />
  );

  else if (view === "invoice") viewEl = (
    <InvoiceView
      viewingOrderId={viewingOrderId} allOrders={allOrders} ordersLoaded={ordersLoaded} ordersError={ordersError} reloadOrders={loadOrders} buyer={buyer} orderLines={orderLines}
      totalWSP={totalWSP} vatInfo={vatInfo} vatAmount={vatAmount} shippingAmount={shippingAmount} totalWithVat={totalWithVat} depositAmount={depositAmount} depositInvoiceTotal={depositInvoiceTotal} totalBeforeShipping={totalBeforeShipping}
      invoiceSource={invoiceSource} invoiceViewType={invoiceViewType} setInvoiceViewType={setInvoiceViewType}
      setView={setView} setViewingOrderId={setViewingOrderId} setInvoiceSource={setInvoiceSource} setQuantities={setQuantities} setAppliedPromo={setAppliedPromo}
      handlePrint={handlePrint}
    />
  );

  return (
    <>
      {viewEl}
      <Toast message={toast.message} visible={toast.visible} onHide={hideToast} bottom={view === "catalog" && totalItems > 0 ? 104 : 28} />
      {/* One dialog for the whole app, mounted next to the one Toast. Views
          used to render their own, so a confirm raised from a view that didn't
          have one (Sign Out with unsaved stock, from the catalogue) set the
          state and rendered nothing — a dead button. */}
      <ConfirmModal {...confirm} onCancel={closeConfirm} />
    </>
  );
}
