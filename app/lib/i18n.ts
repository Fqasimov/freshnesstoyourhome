import { useSyncExternalStore } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Three languages, Azerbaijani first.
 *
 * AZ is the source of truth and the app's default; RU and EN are translations
 * of it. Every key exists in all three — a missing one falls back to AZ rather
 * than rendering blank, because a customer seeing nothing is worse than a
 * customer seeing the wrong language.
 *
 * The language is module state rather than React context so that non-component
 * code — the API client, a formatter — can read it without being passed a
 * hook. Components subscribe through `useLang()`.
 */
export const LANGS = ['az', 'ru', 'en'] as const
export type Lang = (typeof LANGS)[number]

const STORAGE_KEY = 'lang'

let current: Lang = 'az'
const listeners = new Set<() => void>()

function emit () { listeners.forEach(fn => fn()) }

/** Readable from anywhere, including outside React. */
export function getLang (): Lang { return current }

export async function loadLang (): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    if (stored && (LANGS as readonly string[]).includes(stored)) {
      current = stored as Lang
      emit()
    }
  } catch {
    // First run, or storage unavailable. The default stands.
  }
}

export async function setLang (next: Lang): Promise<void> {
  if (!(LANGS as readonly string[]).includes(next)) return
  current = next
  emit()
  try { await AsyncStorage.setItem(STORAGE_KEY, next) } catch { /* not fatal */ }
}

/** Re-renders a component when the language changes. */
export function useLang (): Lang {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => current,
    () => current,
  )
}

/** Pick the current language out of an {az, ru, en} map from the API. */
export function pick (map: Partial<Record<Lang, string>> | undefined, fallback = ''): string {
  if (!map) return fallback
  return map[current] ?? map.az ?? fallback
}

type Table = Record<string, string>

export const MESSAGES: Record<Lang, Table> = {
  az: {
    "app.name": "Freshness To Your Home",
    "app.tagline": "Təzə. Təmiz. Təbii.",
    "nav.shop": "Mağaza",
    "nav.basket": "Səbət",
    "nav.orders": "Sifarişlər",
    "nav.profile": "Profil",
    "auth.title": "Xoş gəlmisiniz",
    "auth.lead": "E-poçt ünvanınızı yazın — giriş kodu göndərəcəyik. Parol lazım deyil.",
    "auth.email": "E-poçt",
    "auth.send": "Kodu göndər",
    "auth.codeTitle": "Kodu yazın",
    "auth.codeLead": "Kodu {email} ünvanına göndərdik. {minutes} dəqiqə etibarlıdır.",
    "auth.code": "Kod",
    "auth.verify": "Daxil ol",
    "auth.resend": "Kodu yenidən göndər",
    "auth.back": "Ünvanı dəyiş",
    "auth.sent": "Əgər bu ünvan mövcuddursa, kod göndərildi.",
    "auth.spam": "Məktub gəlmirsə, spam qovluğuna baxın.",
    "auth.never": "Bu kodu heç kimə deməyin. Biz onu heç vaxt soruşmuruq.",
    "shop.search": "Axtar",
    "shop.all": "Hamısı",
    "shop.popular": "Ən çox sifariş olunanlar",
    "shop.empty": "Heç nə tapılmadı.",
    "shop.add": "Səbətə at",
    "shop.perKg": "kq-a görə",
    "shop.weighed": "Çəkiyə görə satılır",
    "shop.weighedNote": "Dəqiq çəki kuryerdə ölçülür, son məbləğ bir az dəyişə bilər.",
    "shop.outOfStock": "Stokda yoxdur",
    "cart.title": "Səbət",
    "cart.empty": "Səbətiniz boşdur.",
    "cart.browse": "Məhsullara bax",
    "cart.subtotal": "Məhsullar",
    "cart.delivery": "Çatdırılma",
    "cart.total": "Cəmi",
    "cart.about": "təxminən",
    "cart.upTo": "ən çox {amount}",
    "cart.checkout": "Sifarişi tamamla",
    "cart.remove": "Sil",
    "cart.minimum": "Minimum sifariş: {amount}",
    "checkout.title": "Sifariş",
    "checkout.address": "Çatdırılma ünvanı",
    "checkout.addAddress": "Ünvan əlavə et",
    "checkout.date": "Çatdırılma tarixi",
    "checkout.dateNote": "Sifarişlər ən azı bir gün əvvəldən qəbul olunur.",
    "checkout.payment": "Ödəniş",
    "checkout.cash": "Nağd",
    "checkout.pos": "Kartla (POS)",
    "checkout.paymentNote": "Ödəniş qapıda edilir. Tətbiqdə heç nə ödənilmir.",
    "checkout.note": "Qeyd (istəyə bağlı)",
    "checkout.place": "Sifarişi təsdiqlə",
    "checkout.placing": "Göndərilir…",
    "orders.title": "Sifarişlərim",
    "orders.empty": "Hələ sifarişiniz yoxdur.",
    "orders.cancel": "Sifarişi ləğv et",
    "orders.cancelConfirm": "Bu sifarişi ləğv etmək istəyirsiniz?",
    "orders.estimate": "Təxmini məbləğ",
    "orders.final": "Yekun məbləğ",
    "orders.weighedPending": "Çəki hələ ölçülməyib",
    "status.placed": "Qəbul edildi",
    "status.confirmed": "Təsdiqləndi",
    "status.preparing": "Hazırlanır",
    "status.out_for_delivery": "Yoldadır",
    "status.delivered": "Çatdırıldı",
    "status.cancelled": "Ləğv edildi",
    "profile.title": "Profil",
    "profile.name": "Ad və soyad",
    "profile.phone": "Telefon",
    "profile.language": "Dil",
    "profile.addresses": "Ünvanlarım",
    "profile.save": "Yadda saxla",
    "profile.saved": "Yadda saxlanıldı",
    "profile.complete": "Sifariş vermək üçün ad və telefon nömrənizi əlavə edin.",
    "profile.logout": "Çıxış",
    "profile.deleteAccount": "Hesabı sil",
    "profile.deleteWarn": "Hesabınız və şəxsi məlumatlarınız həmişəlik silinəcək. Bunu geri qaytarmaq mümkün deyil.",
    "profile.deleteConfirm": "Bəli, hesabı sil",
    "profile.support": "Əlaqə",
    "address.title": "Ünvan",
    "address.label": "Ad (Ev, İş)",
    "address.line": "Küçə, bina, mənzil",
    "address.notes": "Əlavə qeyd (mərtəbə, domofon)",
    "address.zone": "Ərazi",
    "address.save": "Yadda saxla",
    "address.delete": "Sil",
    "address.none": "Hələ ünvan əlavə etməmisiniz.",
    "err.offline": "İnternet bağlantısı yoxdur.",
    "err.generic": "Xəta baş verdi. Yenidən cəhd edin.",
    "err.code": "Kod düzgün deyil. Yeni kod istəyin.",
    "ok": "Oldu",
    "cancel": "İmtina",
    "retry": "Yenidən",
    "loading": "Yüklənir…",
  },
  ru: {
    "app.name": "Freshness To Your Home",
    "app.tagline": "Свежо. Чисто. Натурально.",
    "nav.shop": "Магазин",
    "nav.basket": "Корзина",
    "nav.orders": "Заказы",
    "nav.profile": "Профиль",
    "auth.title": "Добро пожаловать",
    "auth.lead": "Введите адрес электронной почты — мы пришлём код для входа. Пароль не нужен.",
    "auth.email": "Эл. почта",
    "auth.send": "Отправить код",
    "auth.codeTitle": "Введите код",
    "auth.codeLead": "Мы отправили код на {email}. Он действует {minutes} минут.",
    "auth.code": "Код",
    "auth.verify": "Войти",
    "auth.resend": "Отправить код ещё раз",
    "auth.back": "Изменить адрес",
    "auth.sent": "Если этот адрес существует, код отправлен.",
    "auth.spam": "Если письма нет, проверьте папку «Спам».",
    "auth.never": "Никому не сообщайте этот код. Мы никогда его не спрашиваем.",
    "shop.search": "Поиск",
    "shop.all": "Всё",
    "shop.popular": "Чаще всего заказывают",
    "shop.empty": "Ничего не найдено.",
    "shop.add": "В корзину",
    "shop.perKg": "за кг",
    "shop.weighed": "Продаётся на вес",
    "shop.weighedNote": "Точный вес измеряется курьером, итоговая сумма может немного отличаться.",
    "shop.outOfStock": "Нет в наличии",
    "cart.title": "Корзина",
    "cart.empty": "Ваша корзина пуста.",
    "cart.browse": "Перейти к товарам",
    "cart.subtotal": "Товары",
    "cart.delivery": "Доставка",
    "cart.total": "Итого",
    "cart.about": "примерно",
    "cart.upTo": "не более {amount}",
    "cart.checkout": "Оформить заказ",
    "cart.remove": "Удалить",
    "cart.minimum": "Минимальный заказ: {amount}",
    "checkout.title": "Оформление",
    "checkout.address": "Адрес доставки",
    "checkout.addAddress": "Добавить адрес",
    "checkout.date": "Дата доставки",
    "checkout.dateNote": "Заказы принимаются минимум за день.",
    "checkout.payment": "Оплата",
    "checkout.cash": "Наличными",
    "checkout.pos": "Картой (POS)",
    "checkout.paymentNote": "Оплата при получении. В приложении ничего не списывается.",
    "checkout.note": "Комментарий (необязательно)",
    "checkout.place": "Подтвердить заказ",
    "checkout.placing": "Отправляем…",
    "orders.title": "Мои заказы",
    "orders.empty": "У вас пока нет заказов.",
    "orders.cancel": "Отменить заказ",
    "orders.cancelConfirm": "Отменить этот заказ?",
    "orders.estimate": "Предварительная сумма",
    "orders.final": "Итоговая сумма",
    "orders.weighedPending": "Вес ещё не измерен",
    "status.placed": "Принят",
    "status.confirmed": "Подтверждён",
    "status.preparing": "Готовится",
    "status.out_for_delivery": "В пути",
    "status.delivered": "Доставлен",
    "status.cancelled": "Отменён",
    "profile.title": "Профиль",
    "profile.name": "Имя и фамилия",
    "profile.phone": "Телефон",
    "profile.language": "Язык",
    "profile.addresses": "Мои адреса",
    "profile.save": "Сохранить",
    "profile.saved": "Сохранено",
    "profile.complete": "Добавьте имя и номер телефона, чтобы оформлять заказы.",
    "profile.logout": "Выйти",
    "profile.deleteAccount": "Удалить аккаунт",
    "profile.deleteWarn": "Ваш аккаунт и личные данные будут удалены навсегда. Это нельзя отменить.",
    "profile.deleteConfirm": "Да, удалить аккаунт",
    "profile.support": "Связаться с нами",
    "address.title": "Адрес",
    "address.label": "Название (Дом, Работа)",
    "address.line": "Улица, дом, квартира",
    "address.notes": "Примечание (этаж, домофон)",
    "address.zone": "Район",
    "address.save": "Сохранить",
    "address.delete": "Удалить",
    "address.none": "Вы ещё не добавили адрес.",
    "err.offline": "Нет подключения к интернету.",
    "err.generic": "Произошла ошибка. Попробуйте ещё раз.",
    "err.code": "Неверный код. Запросите новый.",
    "ok": "Готово",
    "cancel": "Отмена",
    "retry": "Повторить",
    "loading": "Загрузка…",
  },
  en: {
    "app.name": "Freshness To Your Home",
    "app.tagline": "Fresh. Clean. Natural.",
    "nav.shop": "Shop",
    "nav.basket": "Basket",
    "nav.orders": "Orders",
    "nav.profile": "Profile",
    "auth.title": "Welcome",
    "auth.lead": "Enter your email and we will send a sign-in code. No password needed.",
    "auth.email": "Email",
    "auth.send": "Send code",
    "auth.codeTitle": "Enter the code",
    "auth.codeLead": "We sent a code to {email}. It is valid for {minutes} minutes.",
    "auth.code": "Code",
    "auth.verify": "Sign in",
    "auth.resend": "Send another code",
    "auth.back": "Change address",
    "auth.sent": "If that address exists, a code is on its way.",
    "auth.spam": "If it does not arrive, check your spam folder.",
    "auth.never": "Never share this code. We will never ask you for it.",
    "shop.search": "Search",
    "shop.all": "Everything",
    "shop.popular": "Most ordered",
    "shop.empty": "Nothing found.",
    "shop.add": "Add to basket",
    "shop.perKg": "per kg",
    "shop.weighed": "Sold by weight",
    "shop.weighedNote": "The exact weight is measured by the courier, so the final amount may vary slightly.",
    "shop.outOfStock": "Out of stock",
    "cart.title": "Basket",
    "cart.empty": "Your basket is empty.",
    "cart.browse": "Browse products",
    "cart.subtotal": "Items",
    "cart.delivery": "Delivery",
    "cart.total": "Total",
    "cart.about": "about",
    "cart.upTo": "at most {amount}",
    "cart.checkout": "Checkout",
    "cart.remove": "Remove",
    "cart.minimum": "Minimum order: {amount}",
    "checkout.title": "Checkout",
    "checkout.address": "Delivery address",
    "checkout.addAddress": "Add an address",
    "checkout.date": "Delivery date",
    "checkout.dateNote": "Orders are taken at least a day ahead.",
    "checkout.payment": "Payment",
    "checkout.cash": "Cash",
    "checkout.pos": "Card (POS)",
    "checkout.paymentNote": "Payment is taken at the door. Nothing is charged in the app.",
    "checkout.note": "Note (optional)",
    "checkout.place": "Confirm order",
    "checkout.placing": "Sending…",
    "orders.title": "My orders",
    "orders.empty": "You have no orders yet.",
    "orders.cancel": "Cancel order",
    "orders.cancelConfirm": "Cancel this order?",
    "orders.estimate": "Estimated total",
    "orders.final": "Final total",
    "orders.weighedPending": "Not yet weighed",
    "status.placed": "Received",
    "status.confirmed": "Confirmed",
    "status.preparing": "Being prepared",
    "status.out_for_delivery": "On the way",
    "status.delivered": "Delivered",
    "status.cancelled": "Cancelled",
    "profile.title": "Profile",
    "profile.name": "Full name",
    "profile.phone": "Phone",
    "profile.language": "Language",
    "profile.addresses": "My addresses",
    "profile.save": "Save",
    "profile.saved": "Saved",
    "profile.complete": "Add your name and phone number to place orders.",
    "profile.logout": "Sign out",
    "profile.deleteAccount": "Delete account",
    "profile.deleteWarn": "Your account and personal data will be permanently deleted. This cannot be undone.",
    "profile.deleteConfirm": "Yes, delete my account",
    "profile.support": "Contact us",
    "address.title": "Address",
    "address.label": "Name (Home, Work)",
    "address.line": "Street, building, flat",
    "address.notes": "Note (floor, entry code)",
    "address.zone": "Area",
    "address.save": "Save",
    "address.delete": "Delete",
    "address.none": "You have not added an address yet.",
    "err.offline": "No internet connection.",
    "err.generic": "Something went wrong. Please try again.",
    "err.code": "That code is not valid. Request a new one.",
    "ok": "Done",
    "cancel": "Cancel",
    "retry": "Retry",
    "loading": "Loading…",
  },
}

/** Translate, with {placeholder} substitution. */
export function t (key: string, vars?: Record<string, string | number>): string {
  let out = MESSAGES[current][key] ?? MESSAGES.az[key] ?? key

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{${k}}`).join(String(v))
    }
  }

  return out
}
