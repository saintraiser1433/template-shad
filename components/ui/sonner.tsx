import { Toaster as SonnerToaster, toast } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      richColors
      closeButton
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "text-xs",
        },
      }}
    />
  )
}

export { toast }

