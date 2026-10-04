import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { ConfirmToastNotification } from "./ConfirmToastNotification.jsx"
import { ToastMessage } from "./ToastMessage.jsx"

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirm, setConfirm] = useState(null)

  const dismiss = useCallback((id) => {
    setToasts((rows) => rows.filter((row) => row.id !== id))
  }, [])

  const toast = useCallback(
    (message, type = "success") => {
      const id = ++toastId
      setToasts((rows) => [...rows, { id, message, type }])
      window.setTimeout(() => dismiss(id), 4200)
    },
    [dismiss]
  )

  const confirmToast = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirm({
        title: options.title || "Please confirm",
        message: options.message || "Do you want to continue?",
        confirmLabel: options.confirmLabel || "Confirm",
        cancelLabel: options.cancelLabel || "Cancel",
        resolve,
      })
    })
  }, [])

  const value = useMemo(() => ({ toast, confirmToast }), [toast, confirmToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((row) => (
          <ToastMessage
            key={row.id}
            message={row.message}
            type={row.type}
            onDismiss={() => dismiss(row.id)}
          />
        ))}
      </div>
      <ConfirmToastNotification
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel={confirm?.cancelLabel}
        onCancel={() => {
          confirm?.resolve(false)
          setConfirm(null)
        }}
        onConfirm={() => {
          confirm?.resolve(true)
          setConfirm(null)
        }}
      />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside ToastProvider")
  return ctx
}
