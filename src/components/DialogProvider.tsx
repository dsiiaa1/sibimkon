'use client'

import React, { createContext, useState, useCallback, useRef, ReactNode } from 'react'

export interface DialogOptions {
  title?: string
  message: string
  type: 'alert' | 'confirm' | 'prompt'
  defaultValue?: string
  confirmText?: string
  cancelText?: string
}

export interface DialogContextValue {
  showAlert: (message: string, title?: string) => Promise<void>
  showConfirm: (message: string, title?: string) => Promise<boolean>
  showPrompt: (message: string, title?: string, defaultValue?: string) => Promise<string | null>
}

export const DialogContext = createContext<DialogContextValue | undefined>(undefined)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<DialogOptions | null>(null)
  const [inputValue, setInputValue] = useState('')
  // useRef agar React tidak memperlakukan function sebagai updater callback
  // (React setState dengan function argument dipanggil sebagai updater, bukan disimpan)
  const resolveRef = useRef<((value: any) => void) | null>(null)

  const showAlert = useCallback((message: string, title = 'Informasi') => {
    return new Promise<void>((resolve) => {
      setOptions({ type: 'alert', message, title, confirmText: 'OK' })
      resolveRef.current = resolve
      setIsOpen(true)
    })
  }, [])

  const showConfirm = useCallback((message: string, title = 'Konfirmasi') => {
    return new Promise<boolean>((resolve) => {
      setOptions({ type: 'confirm', message, title, confirmText: 'Ya', cancelText: 'Batal' })
      resolveRef.current = resolve
      setIsOpen(true)
    })
  }, [])

  const showPrompt = useCallback((message: string, title = 'Input Diperlukan', defaultValue = '') => {
    return new Promise<string | null>((resolve) => {
      setOptions({ type: 'prompt', message, title, defaultValue, confirmText: 'Simpan', cancelText: 'Batal' })
      setInputValue(defaultValue)
      resolveRef.current = resolve
      setIsOpen(true)
    })
  }, [])

  const handleConfirm = () => {
    setIsOpen(false)
    if (resolveRef.current) {
      if (options?.type === 'prompt') {
        resolveRef.current(inputValue)
      } else if (options?.type === 'confirm') {
        resolveRef.current(true)
      } else {
        resolveRef.current(undefined)
      }
      resolveRef.current = null
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
    if (resolveRef.current) {
      if (options?.type === 'prompt') {
        resolveRef.current(null)
      } else if (options?.type === 'confirm') {
        resolveRef.current(false)
      } else {
        resolveRef.current(undefined)
      }
      resolveRef.current = null
    }
  }

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {isOpen && options && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(2,6,15,0.80)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl bg-[#0B1220] border border-[#2a3f63] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">{options.title}</h3>
              <p className="text-slate-300 text-sm mb-4 whitespace-pre-wrap">{options.message}</p>
              
              {options.type === 'prompt' && (
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full bg-[#1a2942] border border-[#2a3f63] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#3dd9b0]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirm()
                    if (e.key === 'Escape') handleCancel()
                  }}
                />
              )}
            </div>
            
            <div className="bg-[#121c2f] p-4 flex justify-end gap-3 border-t border-[#2a3f63]">
              {options.type !== 'alert' && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-lg font-medium text-slate-300 hover:bg-[#1a2942] transition-colors"
                >
                  {options.cancelText}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className="px-4 py-2 rounded-lg font-medium bg-[#3dd9b0] text-[#0B1220] hover:bg-[#2bb394] transition-colors"
              >
                {options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}
