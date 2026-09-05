import Swal from 'sweetalert2';

/** Notificaciones y confirmaciones con la identidad visual BTW. */

const BRAND = '#8b0020';

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2400,
  timerProgressBar: true,
  didOpen: (el: HTMLElement) => {
    el.addEventListener('mouseenter', Swal.stopTimer);
    el.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

export function notifySuccess(title: string, text?: string): void {
  void toast.fire({ icon: 'success', title, text });
}

export function notifyInfo(title: string, text?: string): void {
  void toast.fire({ icon: 'info', title, text });
}

export async function confirmAction(options: {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
}): Promise<boolean> {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? 'Sí, continuar',
    cancelButtonText: options.cancelText ?? 'Cancelar',
    confirmButtonColor: BRAND,
    reverseButtons: true,
    focusCancel: true,
  });
  return result.isConfirmed;
}
