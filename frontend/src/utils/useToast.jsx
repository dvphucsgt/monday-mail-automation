import { toast } from 'react-toastify'

export function useToast() {
  function success(message) {
    toast.success(message, { position: 'top-right', autoClose: 3000 })
  }

  function error(message) {
    toast.error(message, { position: 'top-right', autoClose: 4000 })
  }

  function info(message) {
    toast.info(message, { position: 'top-right', autoClose: 3000 })
  }

  function confirm(message, { onOk, onCancel }) {
    toast.info(
      ({ closeToast }) => (
        <div>
          <div style={{ marginBottom: 12 }}>{message}</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { closeToast(); onCancel?.() }}
              style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #d0d1d5', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              onClick={() => { closeToast(); onOk?.() }}
              style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#0073ea', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
            >
              OK
            </button>
          </div>
        </div>
      ),
      { position: 'top-center', autoClose: false, closeOnClick: false, closeButton: false, draggable: false }
    )
  }

  return { success, error, info, confirm }
}
