import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastProps {
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastProps) {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} removeToast={removeToast} />
            ))}
        </div>
    );
}

function Toast({ toast, removeToast }: { toast: ToastMessage; removeToast: (id: string) => void }) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
                removeToast(toast.id);
            }, 300); // Wait for exit animation to complete
        }, 3000);

        return () => clearTimeout(timer);
    }, [toast.id, removeToast]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            removeToast(toast.id);
        }, 300);
    };

    const getIcon = () => {
        switch (toast.type) {
            case 'success': return <CheckCircle className="text-[#89d185]" size={16} />; // VSCode green
            case 'error': return <AlertCircle className="text-[#f14c4c]" size={16} />; // VSCode red
            case 'info': return <Info className="text-[#3794ff]" size={16} />; // VSCode blue
        }
    };

    return (
        <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded border shadow-lg max-w-sm w-full bg-[#252526] border-[#3d3d3d] ${isExiting ? 'animate-slide-out' : 'animate-slide-in'
            }`}>
            {getIcon()}
            <p className="text-sm font-sans text-zinc-300 flex-1">{toast.message}</p>
            <button
                onClick={handleClose}
                className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 rounded hover:bg-[#3d3d3d]"
            >
                <X size={14} />
            </button>
        </div>
    );
}
