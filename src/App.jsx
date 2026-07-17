import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './supabaseClient';
import {
  Home, CreditCard, Wallet, ListOrdered, Plus,
  ChevronLeft, ChevronRight, X, Landmark, Trash2,
  CheckCircle2, Copy, AlertOctagon, Loader2, Receipt,
  UploadCloud, FileText, Check
} from 'lucide-react';

// ============================================
// UTILITÁRIOS E CONSTANTES
// ============================================
const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const getMonthYearString = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const formatDate = (dateString) =>
  new Date(dateString + 'T12:00:00').toLocaleDateString('pt-BR');

const CATEGORIAS = ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Casa', 'Educação', 'Outros'];

/**
 * Calcula em qual fatura uma compra vai cair baseado na data da compra e dia de fechamento
 */
const calculateInvoiceMonth = (purchaseDate, closingDay) => {
  const purchase = new Date(purchaseDate + 'T12:00:00');
  const purchaseDay = purchase.getDate();
  const purchaseMonth = purchase.getMonth();
  const purchaseYear = purchase.getFullYear();

  if (purchaseDay > closingDay) {
    const nextMonth = new Date(purchaseYear, purchaseMonth + 2, 1);
    return getMonthYearString(new Date(purchaseYear, purchaseMonth + 2, 0));
  }
  
  const invoiceDate = new Date(purchaseYear, purchaseMonth + 1, 1);
  return getMonthYearString(invoiceDate);
};

/**
 * Gera as parcelas de uma compra
 */
const generateInstallments = (purchase, closingDay) => {
  const installments = [];
  const totalInstallments = purchase.installments || 1;
  const installmentValue = Number(purchase.amount) / totalInstallments;
  
  const purchaseDate = new Date(purchase.date + 'T12:00:00');
  const purchaseDay = purchaseDate.getDate();
  let invoiceMonth = purchaseDate.getMonth();
  let invoiceYear = purchaseDate.getFullYear();

  if (purchaseDay > closingDay) {
    invoiceMonth += 2;
  } else {
    invoiceMonth += 1;
  }

  if (invoiceMonth > 11) {
    invoiceYear += Math.floor(invoiceMonth / 12);
    invoiceMonth = invoiceMonth % 12;
  }

  for (let i = 0; i < totalInstallments; i++) {
    let month = invoiceMonth + i;
    let year = invoiceYear;

    if (month > 11) {
      year += Math.floor(month / 12);
      month = month % 12;
    }

    const invoiceDate = new Date(year, month, 1);
    
    installments.push({
      ...purchase,
      installment_number: i + 1,
      total_installments: totalInstallments,
      installment_value: installmentValue,
      invoice_month: getMonthYearString(invoiceDate)
    });
  }

  return installments;
};

// ============================================
// COMPONENTES UI REUTILIZÁVEIS
// ============================================

function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center flex-col gap-4">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
      <p className="font-black text-indigo-600">CARREGANDO...</p>
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-lg z-[200] font-bold text-sm ${
        type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
      }`}
    >
      {message}
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Fechar modal"
          >
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-black text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 mb-8">{message}</p>
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

function FormInput({ label, error, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-bold text-slate-500 mb-1 ml-2">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`w-full bg-slate-50 border-2 rounded-2xl px-6 py-4 outline-none font-bold transition-colors ${
          error ? 'border-rose-400' : 'border-transparent focus:border-indigo-300'
        } ${props.className || ''}`}
      />
      {error && <p className="text-rose-500 text-xs mt-1 ml-4">{error}</p>}
    </div>
  );
}

function FormSelect({ label, error, children, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-bold text-slate-500 mb-1 ml-2">
          {label}
        </label>
      )}
      <select
        {...props}
        className={`w-full bg-slate-50 border-2 rounded-2xl px-6 py-4 outline-none font-bold text-slate-500 transition-colors ${
          error ? 'border-rose-400' : 'border-transparent focus:border-indigo-300'
        }`}
      >
        {children}
      </select>
      {error && <p className="text-rose-500 text-xs mt-1 ml-4">{error}</p>}
    </div>
  );
}

// ============================================
// FORMULÁRIOS DOS MODAIS
// ============================================

function TransactionForm({ accounts, cards, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    targetId: '',
    installments: 1,
    isInstallment: false,
    category: 'Outros'
  });
  const [errors, setErrors] = useState({});

  const selectedCard = cards.find((c) => c.id === formData.targetId);
  const isCardSelected = !!selectedCard;

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ 
      ...prev, 
      [field]: value,
      ...(field === 'isInstallment' && !value ? { installments: 1 } : {})
    }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = 'Informe um valor válido';
    if (!formData.description.trim()) newErrors.description = 'Informe uma descrição';
    if (!formData.date) newErrors.date = 'Selecione uma data';
    if (!formData.targetId) newErrors.targetId = 'Selecione uma conta/cartão';
    if (formData.isInstallment && (!formData.installments || formData.installments < 2)) newErrors.installments = 'Mínimo de 2';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const isCard = cards.some((c) => c.id === formData.targetId);
    onSubmit({
      amount: Number(formData.amount),
      description: formData.description.trim(),
      date: formData.date,
      type: isCard ? 'credit_card' : formData.type,
      account_id: isCard ? null : formData.targetId,
      card_id: isCard ? formData.targetId : null,
      installments: isCard && formData.isInstallment ? Number(formData.installments) : 1,
      is_installment: isCard && formData.isInstallment,
      category: formData.category
    });
  };

  return (
    <div className="space-y-4">
      <FormInput type="number" inputMode="decimal" placeholder="R$ 0,00" value={formData.amount} onChange={handleChange('amount')} error={errors.amount} className="text-3xl py-5 rounded-3xl" label="Valor Total" />
      <FormInput type="text" placeholder="Descrição" value={formData.description} onChange={handleChange('description')} error={errors.description} />
      
      <div className="grid grid-cols-2 gap-4">
        <FormInput type="date" value={formData.date} onChange={handleChange('date')} error={errors.date} label="Data" />
        <FormSelect value={formData.category} onChange={handleChange('category')} label="Categoria">
          {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </FormSelect>
      </div>

      <FormSelect value={formData.targetId} onChange={handleChange('targetId')} error={errors.targetId} label="Conta ou Cartão">
        <option value="">Escolher...</option>
        <optgroup label="Contas">
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </optgroup>
        <optgroup label="Cartões de Crédito">
          {cards.map((c) => <option key={c.id} value={c.id}>💳 {c.name} (Fecha dia {c.closing_day})</option>)}
        </optgroup>
      </FormSelect>

      {isCardSelected && (
        <div className="bg-indigo-50 p-4 rounded-2xl space-y-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isInstallment" checked={formData.isInstallment} onChange={handleChange('isInstallment')} className="w-5 h-5 rounded accent-indigo-600" />
            <label htmlFor="isInstallment" className="font-bold text-slate-700">Compra parcelada</label>
          </div>
          {formData.isInstallment && <FormInput type="number" min="2" max="24" placeholder="Número de parcelas" value={formData.installments} onChange={handleChange('installments')} error={errors.installments} label="Quantidade de Parcelas" />}
        </div>
      )}

      {!isCardSelected && (
        <FormSelect value={formData.type} onChange={handleChange('type')} label="Tipo">
          <option value="expense">Despesa (Saída)</option>
          <option value="income">Receita (Entrada)</option>
        </FormSelect>
      )}

      <div className="flex gap-4 mt-10">
        <button onClick={onCancel} disabled={isSubmitting} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs hover:text-slate-600 transition-colors">Cancelar</button>
        <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs uppercase hover:bg-indigo-700 transition-colors disabled:opacity-50">{isSubmitting ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </div>
  );
}

function AccountForm({ onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({ name: '', balance: '', account_type: 'corrente' });
  const [errors, setErrors] = useState({});

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleSubmit = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Informe o nome';
    if (formData.balance === '' || isNaN(Number(formData.balance))) newErrors.balance = 'Informe um saldo válido';
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);
    
    onSubmit({ name: formData.name.trim(), balance: Number(formData.balance), account_type: formData.account_type });
  };

  return (
    <div className="space-y-4">
      <FormInput type="text" placeholder="Nome da Instituição" value={formData.name} onChange={handleChange('name')} error={errors.name} />
      <FormInput type="number" placeholder="Saldo Inicial R$" value={formData.balance} onChange={handleChange('balance')} error={errors.balance} />
      <FormSelect value={formData.account_type} onChange={handleChange('account_type')}>
        <option value="corrente">Conta Corrente</option>
        <option value="investimento">Conta de Investimento</option>
      </FormSelect>
      <div className="flex gap-4 mt-10">
        <button onClick={onCancel} disabled={isSubmitting} className="flex-1 py-4 text-slate-400 font-black text-xs">CANCELAR</button>
        <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs disabled:opacity-50">SALVAR</button>
      </div>
    </div>
  );
}

function CardForm({ onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({ name: '', limit_total: '', closing_day: '', due_day: '' });
  const [errors, setErrors] = useState({});

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleSubmit = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Informe o nome';
    if (!formData.limit_total || Number(formData.limit_total) <= 0) newErrors.limit_total = 'Limite inválido';
    if (!formData.closing_day || Number(formData.closing_day) < 1 || Number(formData.closing_day) > 31) newErrors.closing_day = 'Inválido';
    if (!formData.due_day || Number(formData.due_day) < 1 || Number(formData.due_day) > 31) newErrors.due_day = 'Inválido';
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);

    onSubmit({ name: formData.name.trim(), limit_total: Number(formData.limit_total), closing_day: Number(formData.closing_day), due_day: Number(formData.due_day) });
  };

  return (
    <div className="space-y-4">
      <FormInput type="text" placeholder="Nome do Cartão" value={formData.name} onChange={handleChange('name')} error={errors.name} label="Nome do Cartão" />
      <FormInput type="number" placeholder="Ex: 5000" value={formData.limit_total} onChange={handleChange('limit_total')} error={errors.limit_total} label="Limite Total (R$)" />
      <div className="grid grid-cols-2 gap-4">
        <FormInput type="number" min="1" max="31" placeholder="Ex: 05" value={formData.closing_day} onChange={handleChange('closing_day')} error={errors.closing_day} label="Dia de Fechamento" />
        <FormInput type="number" min="1" max="31" placeholder="Ex: 11" value={formData.due_day} onChange={handleChange('due_day')} error={errors.due_day} label="Dia de Vencimento" />
      </div>
      <div className="flex gap-4 mt-10">
        <button onClick={onCancel} disabled={isSubmitting} className="flex-1 py-4 text-slate-400 font-black text-xs">CANCELAR</button>
        <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs disabled:opacity-50">SALVAR</button>
      </div>
    </div>
  );
}

function BillForm({ onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({ description: '', value: '', due_date: '', payment_method: 'boleto', barcode: '' });
  const [errors, setErrors] = useState({});

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleSubmit = () => {
    const newErrors = {};
    if (!formData.description.trim()) newErrors.description = 'Obrigatório';
    if (!formData.value || Number(formData.value) <= 0) newErrors.value = 'Inválido';
    if (!formData.due_date) newErrors.due_date = 'Obrigatório';
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);

    onSubmit({ description: formData.description.trim(), value: Number(formData.value), due_date: formData.due_date, payment_method: formData.payment_method, barcode: formData.barcode.trim() || null });
  };

  return (
    <div className="space-y-4">
      <FormInput type="text" placeholder="Ex: Aluguel..." value={formData.description} onChange={handleChange('description')} error={errors.description} />
      <FormInput type="number" placeholder="Valor R$" value={formData.value} onChange={handleChange('value')} error={errors.value} />
      <FormInput type="date" value={formData.due_date} onChange={handleChange('due_date')} error={errors.due_date} label="Vencimento" />
      <FormSelect value={formData.payment_method} onChange={handleChange('payment_method')} label="Forma de Pagamento">
        <option value="boleto">Boleto Bancário</option>
        <option value="debito">Débito em Conta</option>
        <option value="pix">PIX</option>
      </FormSelect>
      <FormInput type="text" placeholder="Código de Barras (Opcional)" value={formData.barcode} onChange={handleChange('barcode')} className="text-xs font-mono" />
      <div className="flex gap-4 mt-10">
        <button onClick={onCancel} disabled={isSubmitting} className="flex-1 py-4 text-slate-400 font-black text-xs">CANCELAR</button>
        <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs disabled:opacity-50">SALVAR</button>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTES DAS PÁGINAS/ABAS
// ============================================

function Dashboard({ totals, cardInvoices, currentMonthStr }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl">
          <p className="text-indigo-100 text-xs font-black uppercase tracking-widest mb-1">Saldo Disponível</p>
          <p className="text-4xl font-black mb-6">{formatCurrency(totals.mainBalance)}</p>
          <div className="space-y-3 border-t border-indigo-500/50 pt-5">
            {totals.accounts.filter((a) => a.account_type !== 'investimento').map((acc) => (
              <div key={acc.id} className="flex justify-between text-sm">
                <span className="opacity-80">{acc.name}</span>
                <span className="font-bold">{formatCurrency(acc.currentBalance)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-emerald-500 text-[10px] font-black uppercase mb-1">Receitas</p>
            <p className="text-xl font-black">{formatCurrency(totals.incomeMonth)}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-rose-500 text-[10px] font-black uppercase mb-1">Saídas</p>
            <p className="text-xl font-black">{formatCurrency(totals.expenseMonth)}</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-xl">
          <p className="text-emerald-100 text-xs font-black uppercase tracking-widest mb-1">Investimentos</p>
          <p className="text-3xl font-black mb-4">{formatCurrency(totals.investBalance)}</p>
          <div className="space-y-2 border-t border-emerald-500 pt-4">
            {totals.accounts.filter((a) => a.account_type === 'investimento').map((acc) => (
              <p key={acc.id} className="text-sm font-bold opacity-90">{acc.name}: {formatCurrency(acc.currentBalance)}</p>
            ))}
          </div>
        </div>

        {cardInvoices.length > 0 && (
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4">💳 Faturas do Mês</p>
            <div className="space-y-4">
              {cardInvoices.map((invoice) => (
                <div key={invoice.card.id} className="border-b border-slate-700 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold">{invoice.card.name}</p>
                    <p className="text-xl font-black text-rose-400">{formatCurrency(invoice.total)}</p>
                  </div>
                  <p className="text-xs text-slate-500">Vence dia {invoice.card.due_day} • {invoice.transactions.length} compras</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BillsList({ bills, onTogglePaid, onDelete, onAdd, onCopyBarcode }) {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black">Despesas Fixas</h2>
        <button onClick={onAdd} className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 transition-colors"><Plus /></button>
      </div>
      {bills.length === 0 ? (
        <p className="text-center text-slate-400 py-12">Nenhuma despesa fixa cadastrada</p>
      ) : (
        bills.map((bill) => (
          <div key={bill.id} className={`bg-white p-5 rounded-3xl shadow-sm border-2 transition-all ${bill.is_paid ? 'border-emerald-100 opacity-60' : 'border-white'}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className={`font-black text-lg ${bill.is_paid ? 'line-through text-slate-400' : 'text-slate-800'}`}>{bill.description}</p>
                <p className="text-xs font-bold text-slate-400">Vence: {formatDate(bill.due_date)}</p>
                {bill.barcode && (
                  <div className="mt-3 flex items-center gap-2 bg-slate-50 p-2 rounded-xl">
                    <p className="text-[9px] font-mono text-slate-500 truncate flex-1">{bill.barcode}</p>
                    <button onClick={() => onCopyBarcode(bill.barcode)} className="text-slate-400 hover:text-indigo-600 transition-colors"><Copy size={14} /></button>
                  </div>
                )}
              </div>
              <button onClick={() => onTogglePaid(bill)} className={`transition-colors ${bill.is_paid ? 'text-emerald-500' : 'text-slate-200 hover:text-emerald-400'}`}><CheckCircle2 size={36} /></button>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-[9px] font-black px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full uppercase">{bill.payment_method}</span>
              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-rose-600">{formatCurrency(bill.value)}</span>
                <button onClick={() => onDelete(bill.id)} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function TransactionsList({ transactions, cards, currentMonthStr, onDelete }) {
  const processedTransactions = useMemo(() => {
    const result = [];
    transactions.forEach((t) => {
      if (t.type === 'credit_card' && t.card_id) {
        const card = cards.find((c) => c.id === t.card_id);
        if (card) {
          const installments = generateInstallments(t, card.closing_day);
          installments.forEach((inst) => {
            if (inst.invoice_month === currentMonthStr) {
              result.push({
                ...inst,
                displayDescription: inst.is_installment 
                  ? `${inst.description} (${inst.installment_number}/${inst.total_installments})`
                  : inst.description,
                displayAmount: inst.installment_value
              });
            }
          });
        }
      } else if (t.date.startsWith(currentMonthStr)) {
        result.push({ ...t, displayDescription: t.description, displayAmount: Number(t.amount) });
      }
    });
    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, cards, currentMonthStr]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-2xl font-black">Extrato do Mês</h2>
      {processedTransactions.length === 0 ? (
        <p className="text-center text-slate-400 py-12">Nenhuma transação neste mês</p>
      ) : (
        processedTransactions.map((t, index) => (
          <div key={`${t.id}-${t.installment_number || 0}-${index}`} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {t.type === 'credit_card' && <div className="bg-purple-100 p-2 rounded-xl"><CreditCard size={16} className="text-purple-600" /></div>}
              <div>
                <p className="font-black text-slate-700">{t.displayDescription}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] font-bold text-slate-400">
                    {formatDate(t.date)}
                    {t.type === 'credit_card' && ' • Cartão'}
                  </p>
                  {t.category && <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 rounded-full">{t.category}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className={`font-black text-lg ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                {t.type === 'income' ? '+' : '-'} {formatCurrency(t.displayAmount)}
              </p>
              {!t.installment_number && (
                <button onClick={() => onDelete(t.id)} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AccountsList({ accounts, onDelete, onAdd }) {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black">Contas</h2>
        <button onClick={onAdd} className="bg-indigo-600 text-white px-5 py-2 rounded-2xl text-xs font-black hover:bg-indigo-700 transition-colors">+ NOVA</button>
      </div>
      {accounts.map((acc) => (
        <div key={acc.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><Landmark size={24} /></div>
            <div>
              <p className="font-black text-slate-800">{acc.name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{acc.account_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="font-black text-xl">{formatCurrency(acc.currentBalance)}</p>
            <button onClick={() => onDelete(acc.id)} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CardsList({ cards, cardInvoices, currentMonthStr, onDelete, onAdd }) {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black">Cartões</h2>
        <button onClick={onAdd} className="bg-indigo-600 text-white px-5 py-2 rounded-2xl text-xs font-black hover:bg-indigo-700 transition-colors">+ NOVO</button>
      </div>
      {cards.map((card) => {
        const invoice = cardInvoices.find((i) => i.card.id === card.id);
        const usedLimit = invoice?.total || 0;
        const availableLimit = Number(card.limit_total) - usedLimit;
        const usagePercent = (usedLimit / Number(card.limit_total)) * 100;

        return (
          <div key={card.id} className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5"><CreditCard size={100} /></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <p className="font-black tracking-widest text-lg">{card.name.toUpperCase()}</p>
                <button onClick={() => onDelete(card.id)} className="text-white/20 hover:text-rose-400 transition-colors"><Trash2 size={20} /></button>
              </div>
              <div className="flex gap-6 mb-6">
                <div><p className="text-[10px] font-black opacity-40 uppercase">Fecha dia</p><p className="text-xl font-black">{card.closing_day}</p></div>
                <div><p className="text-[10px] font-black opacity-40 uppercase">Vence dia</p><p className="text-xl font-black">{card.due_day}</p></div>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-2"><span className="opacity-60">Fatura atual</span><span className="font-bold text-rose-400">{formatCurrency(usedLimit)}</span></div>
                <div className="bg-slate-700 rounded-full h-2 overflow-hidden"><div className={`h-full rounded-full transition-all ${usagePercent > 80 ? 'bg-rose-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(usagePercent, 100)}%` }} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-[10px] font-black opacity-40 uppercase mb-1">Limite Total</p><p className="text-lg font-black">{formatCurrency(card.limit_total)}</p></div>
                <div><p className="text-[10px] font-black opacity-40 uppercase mb-1">Disponível</p><p className="text-lg font-black text-emerald-400">{formatCurrency(availableLimit)}</p></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL - APP
// ============================================
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modais de Criação
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, table: '', id: '' });
  const [toast, setToast] = useState(null);

  // Estados da Leitura de IA (Importação)
  const [isUploading, setIsUploading] = useState(false);
  const [extractedExpenses, setExtractedExpenses] = useState([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const currentMonthStr = getMonthYearString(currentMonthDate);

  const showToast = useCallback((message, type = 'success') => { setToast({ message, type }); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [accountsRes, cardsRes, transactionsRes, billsRes] = await Promise.all([
        supabase.from('accounts').select('*').order('name'),
        supabase.from('cards').select('*').order('name'),
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('bills').select('*').order('due_date')
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (cardsRes.error) throw cardsRes.error;
      if (transactionsRes.error) throw transactionsRes.error;
      if (billsRes.error) throw billsRes.error;

      setAccounts(accountsRes.data || []);
      setCards(cardsRes.data || []);
      setTransactions(transactionsRes.data || []);
      setBills(billsRes.data || []);
    } catch (err) {
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totals = useMemo(() => {
    const processedAccounts = accounts.map((acc) => {
      const accTrans = transactions.filter((t) => t.account_id === acc.id);
      const income = accTrans.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = accTrans.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      return { ...acc, currentBalance: Number(acc.balance) + income - expense };
    });
    const currentMonthTrans = transactions.filter((t) => t.date.startsWith(currentMonthStr) && t.type !== 'credit_card');
    return {
      accounts: processedAccounts,
      mainBalance: processedAccounts.filter((a) => a.account_type !== 'investimento').reduce((sum, a) => sum + a.currentBalance, 0),
      investBalance: processedAccounts.filter((a) => a.account_type === 'investimento').reduce((sum, a) => sum + a.currentBalance, 0),
      incomeMonth: currentMonthTrans.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
      expenseMonth: currentMonthTrans.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)
    };
  }, [accounts, transactions, currentMonthStr]);

  const cardInvoices = useMemo(() => {
    return cards.map((card) => {
      const cardTransactions = transactions.filter((t) => t.card_id === card.id && t.type === 'credit_card');
      const invoiceTransactions = [];
      let total = 0;
      cardTransactions.forEach((t) => {
        const installments = generateInstallments(t, card.closing_day);
        installments.forEach((inst) => {
          if (inst.invoice_month === currentMonthStr) {
            invoiceTransactions.push(inst);
            total += inst.installment_value;
          }
        });
      });
      return { card, transactions: invoiceTransactions, total };
    }).filter((invoice) => invoice.transactions.length > 0 || true); 
  }, [cards, transactions, currentMonthStr]);

  // Funções CRUD Genéricas
  const handleAddAccount = async (data) => {
    setIsSubmitting(true);
    try { await supabase.from('accounts').insert([data]); showToast('Conta criada!'); setIsAccountModalOpen(false); fetchData(); } 
    catch (err) { showToast('Erro', 'error'); } finally { setIsSubmitting(false); }
  };

  const handleAddCard = async (data) => {
    setIsSubmitting(true);
    try { await supabase.from('cards').insert([data]); showToast('Cartão criado!'); setIsCardModalOpen(false); fetchData(); } 
    catch (err) { showToast('Erro', 'error'); } finally { setIsSubmitting(false); }
  };

  const handleAddBill = async (data) => {
    setIsSubmitting(true);
    try { await supabase.from('bills').insert([{ ...data, is_paid: false }]); showToast('Despesa fixa criada!'); setIsBillModalOpen(false); fetchData(); } 
    catch (err) { showToast('Erro', 'error'); } finally { setIsSubmitting(false); }
  };

  const handleAddTransaction = async (data) => {
    setIsSubmitting(true);
    try { await supabase.from('transactions').insert([data]); showToast('Transação registrada!'); setIsTransactionModalOpen(false); fetchData(); } 
    catch (err) { showToast('Erro', 'error'); } finally { setIsSubmitting(false); }
  };

  const toggleBillPaid = async (bill) => {
    try { await supabase.from('bills').update({ is_paid: !bill.is_paid }).eq('id', bill.id); showToast(bill.is_paid ? 'Pendente' : 'Pago!'); fetchData(); } 
    catch (err) { showToast('Erro', 'error'); }
  };

  const handleDelete = async () => {
    const { table, id } = confirmDialog;
    try { await supabase.from(table).delete().eq('id', id); showToast('Excluído com sucesso!'); fetchData(); } 
    catch (err) { showToast('Erro', 'error'); }
  };

  const openDeleteConfirm = (table, id) => setConfirmDialog({ isOpen: true, table, id });

  // === SISTEMA DE LEITURA DE FATURA (MOCK IA) ===
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);

    // Mock IA: Simula 3 segundos lendo o PDF/Imagem e retorna as despesas formatadas
    setTimeout(() => {
      setExtractedExpenses([
        { id: 1, description: 'UBER *TRIP', amount: 25.50, date: currentMonthStr + '-15', category: 'Transporte', card_id: cards[0]?.id || '' },
        { id: 2, description: 'IFOOD *LANCHE', amount: 45.90, date: currentMonthStr + '-16', category: 'Alimentação', card_id: cards[0]?.id || '' },
        { id: 3, description: 'PAG*MERCADOLIVRE', amount: 120.00, date: currentMonthStr + '-18', category: 'Outros', card_id: cards[0]?.id || '' },
      ]);
      setIsUploading(false);
      setIsReviewModalOpen(true);
    }, 3000);
  };

  const handleSaveExtractedExpenses = async () => {
    setIsSubmitting(true);
    try {
      const formattedData = extractedExpenses.map(exp => ({
        description: exp.description,
        amount: Number(exp.amount),
        date: exp.date,
        type: 'credit_card',
        category: exp.category,
        card_id: exp.card_id || null
      }));
      
      const { error } = await supabase.from('transactions').insert(formattedData);
      if (error) throw error;

      showToast('Despesas importadas com sucesso!');
      setIsReviewModalOpen(false);
      setActiveTab('transactions'); 
      fetchData();
    } catch (err) {
      showToast('Erro ao importar', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return ( <div className="flex flex-col items-center justify-center h-screen text-center"><AlertOctagon className="text-rose-500 mb-4" size={48} /><p className="mb-4">{error}</p><button onClick={fetchData} className="bg-indigo-600 text-white px-6 py-3 rounded-xl">Tentar Novamente</button></div> );

  return (
    <div className="bg-slate-50 min-h-screen pb-28 font-sans text-slate-900">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white sticky top-0 z-40 px-6 py-5 shadow-sm border-b border-slate-100">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1))} className="p-2 hover:bg-slate-100 rounded-xl"><ChevronLeft size={24} /></button>
          <h1 className="text-xl font-black capitalize tracking-tight text-indigo-950">{currentMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h1>
          <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1))} className="p-2 hover:bg-slate-100 rounded-xl"><ChevronRight size={24} /></button>
        </div>
      </header>

      <main className="px-5 max-w-5xl mx-auto mt-8">
        {activeTab === 'dashboard' && <Dashboard totals={totals} cardInvoices={cardInvoices} currentMonthStr={currentMonthStr} />}
        {activeTab === 'bills' && <BillsList bills={bills} onTogglePaid={toggleBillPaid} onDelete={(id) => openDeleteConfirm('bills', id)} onAdd={() => setIsBillModalOpen(true)} onCopyBarcode={(code) => {navigator.clipboard.writeText(code); showToast('Copiado!');}} />}
        {activeTab === 'transactions' && <TransactionsList transactions={transactions} cards={cards} currentMonthStr={currentMonthStr} onDelete={(id) => openDeleteConfirm('transactions', id)} />}
        {activeTab === 'accounts' && <AccountsList accounts={totals.accounts} onDelete={(id) => openDeleteConfirm('accounts', id)} onAdd={() => setIsAccountModalOpen(true)} />}
        {activeTab === 'cards' && <CardsList cards={cards} cardInvoices={cardInvoices} currentMonthStr={currentMonthStr} onDelete={(id) => openDeleteConfirm('cards', id)} onAdd={() => setIsCardModalOpen(true)} />}
        
        {/* ABA IMPORTAR (NOVIDADE) */}
        {activeTab === 'import' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl font-black text-slate-800">Leitura Inteligente</h2>
            <p className="text-slate-500 text-sm font-medium">Faça upload da sua fatura em PDF ou envie um print das suas despesas. A Inteligência Artificial vai extrair e organizar tudo para você.</p>
            
            <div className="bg-white border-2 border-dashed border-indigo-200 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center transition-all hover:bg-indigo-50 relative cursor-pointer">
              <input 
                type="file" 
                accept="application/pdf, image/*" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="animate-pulse flex flex-col items-center">
                  <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-black text-indigo-600">Lendo arquivo com IA...</p>
                  <p className="text-xs text-indigo-400 mt-2">Identificando valores e categorias...</p>
                </div>
              ) : (
                <>
                  <UploadCloud size={64} className="text-indigo-400 mb-4" />
                  <p className="text-xl font-black text-indigo-900 mb-2">Toque para anexar fatura</p>
                  <p className="text-sm font-bold text-slate-400">Suporta PDFs, JPG e PNG</p>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 w-full bg-white/80 backdrop-blur-xl border-t border-slate-100 py-5 z-40">
        <div className="max-w-lg mx-auto flex justify-around">
          {[
            { id: 'dashboard', icon: Home, label: 'Início' },
            { id: 'import', icon: FileText, label: 'Importar' },
            { id: 'bills', icon: AlertOctagon, label: 'Fixas' },
            { id: 'transactions', icon: ListOrdered, label: 'Extrato' },
            { id: 'cards', icon: CreditCard, label: 'Cartões' }
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === id ? 'text-indigo-600' : 'text-slate-300'}`}>
              <Icon size={26} />
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <button onClick={() => setIsTransactionModalOpen(true)} className="fixed bottom-28 right-8 bg-indigo-600 text-white p-5 rounded-3xl shadow-2xl z-50 hover:bg-indigo-700 transition-transform hover:scale-105"><Plus size={32} /></button>

      {/* MODAIS */}
      <Modal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)} title="Novo Lançamento">
        <TransactionForm accounts={accounts} cards={cards} onSubmit={handleAddTransaction} onCancel={() => setIsTransactionModalOpen(false)} isSubmitting={isSubmitting} />
      </Modal>
      <Modal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} title="Nova Conta"><AccountForm onSubmit={handleAddAccount} onCancel={() => setIsAccountModalOpen(false)} isSubmitting={isSubmitting} /></Modal>
      <Modal isOpen={isCardModalOpen} onClose={() => setIsCardModalOpen(false)} title="Novo Cartão"><CardForm onSubmit={handleAddCard} onCancel={() => setIsCardModalOpen(false)} isSubmitting={isSubmitting} /></Modal>
      <Modal isOpen={isBillModalOpen} onClose={() => setIsBillModalOpen(false)} title="Nova Despesa Fixa"><BillForm onSubmit={handleAddBill} onCancel={() => setIsBillModalOpen(false)} isSubmitting={isSubmitting} /></Modal>
      
      {/* MODAL DE REVISÃO E CLASSIFICAÇÃO MANUAL */}
      <Modal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} title="Revisão de Despesas">
        <p className="text-sm font-medium text-slate-500 mb-6 -mt-4">Confira e classifique os gastos identificados antes de salvar.</p>
        <div className="space-y-4 mb-8">
          {extractedExpenses.map((exp, index) => (
            <div key={exp.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <input type="text" value={exp.description} onChange={(e) => { const newArr = [...extractedExpenses]; newArr[index].description = e.target.value; setExtractedExpenses(newArr); }} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-black text-slate-700 outline-none" />
                <input type="number" value={exp.amount} onChange={(e) => { const newArr = [...extractedExpenses]; newArr[index].amount = e.target.value; setExtractedExpenses(newArr); }} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-black text-rose-500 outline-none" />
              </div>
              <div className="space-y-2">
                <select value={exp.category} onChange={(e) => { const newArr = [...extractedExpenses]; newArr[index].category = e.target.value; setExtractedExpenses(newArr); }} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-500 outline-none">
                  {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <select value={exp.card_id} onChange={(e) => { const newArr = [...extractedExpenses]; newArr[index].card_id = e.target.value; setExtractedExpenses(newArr); }} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-500 outline-none">
                  <option value="">Escolher Cartão</option>
                  {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button onClick={() => setExtractedExpenses(extractedExpenses.filter(e => e.id !== exp.id))} className="text-xs font-black text-rose-500 flex items-center gap-1"><Trash2 size={12}/> Remover Linha</button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsReviewModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase">Descartar</button>
          <button onClick={handleSaveExtractedExpenses} disabled={isSubmitting} className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-2xl text-xs uppercase flex justify-center items-center gap-2">
            {isSubmitting ? 'Salvando...' : <><Check size={18}/> Salvar Tudo</>}
          </button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog({ isOpen: false, table: '', id: '' })} onConfirm={handleDelete} title="Confirmar Exclusão" message="Tem certeza que deseja excluir este item?" />
    </div>
  );
}