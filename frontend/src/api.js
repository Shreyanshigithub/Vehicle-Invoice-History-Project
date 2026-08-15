import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export async function uploadInvoice(file) {
  const form = new FormData();
  form.append('invoice', file);
  const { data } = await api.post('/invoices/upload', form);
  return data;
}

export async function getInvoices(search = '') {
  const { data } = await api.get('/invoices', { params: { search } });
  return data;
}

export async function getHistory(vehicleNumber) {
  const { data } = await api.get(`/invoices/vehicle/${encodeURIComponent(vehicleNumber)}/history`);
  return data;
}

export async function deleteInvoice(id) {
  const { data } = await api.delete(`/invoices/${id}`);
  return data;
}
