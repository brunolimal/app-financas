import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  Home, CreditCard, Wallet, ListOrdered, Plus, 
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, X, Landmark, Trash2
} from 'lucide-react';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const getMonthYearString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  const currentMonthStr = getMonthYearString(currentMonthDate);

  const fetchData = async () => {
    setLoading(true);
    const { data: accs } = await supabase.from('accounts').select('*').order('name');
    const { data: crds } = await supabase.from('cards').select('*').order('name');
    const { data: trans } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (accs) setAccounts(accs);
    if (crds) setCards(crds);
    if (trans) setTransactions(trans);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- FUNCOES DE EXCLUSAO ---
  const handleDelete = async (table, id) => {
    if (window.confirm("Tem certeza que deseja excluir?")) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) alert("Erro ao excluir: " + error.message);
      else fetchData();
    }
  };

  const handleAddAccount = async (account) => {
    const { error } = await supabase.from('accounts').insert([{ name: account.name, balance: Number(account.balance) }]);
    if (error) alert(error.message);
    else { fetchData(); setIsAccountModalOpen(false); }
  };

  const handleAddCard = async (card) => {
    const { error } = await supabase.from('cards').insert([{ name: card.name, limit_total: Number(card.limit) }]);
    if (error) alert(error.message);
    else { fetchData(); setIsCardModalOpen(false); }
  };

  const handleAddTransaction = async (data) => {
    const { error } = await supabase.from('transactions').insert([{
      type: data.type,
      amount: Number(data.amount),
      description: data.description,
      date: data.date,
      account_id: data.accountId || null,
      card_id: data.cardId || null
    }]);
    if (error) alert(error.message);
    else { fetchData(); setIsTransactionModalOpen(false); }
  };

  const currentMonthTransactions = useMemo(() => transactions.filter(t => t.date.startsWith(currentMonthStr)), [transactions, currentMonthStr]);
  const totals = useMemo(() => {
    let income = 0, expense = 0, creditCard = 0;
    currentMonthTransactions.forEach(t => {
      if (t.type === 'income') income += Number(t.amount);
      if (t.type === 'expense') expense += Number(t.amount);
      if (t.type === 'credit_card') creditCard += Number(t.amount);
    });
    const accountsBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance), 0);
    return { income, expense, creditCard, accountsBalance };
  }, [currentMonthTransactions, accounts]);

  if (loading) return <div className="flex h-screen items-center justify-center font-sans">Carregando...</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-900">
      <header className="bg-white sticky top-0 z-10 px-4 py-4 shadow-sm flex justify-between items-center">
        <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1))}><ChevronLeft /></button>
        <h1 className="text-lg font-semibold capitalize">{currentMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h1>
        <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1))}><ChevronRight /></button>
      </header>

      <main className="px-4 max-w-lg mx-auto mt-4">
        {activeTab === 'dashboard' && (
           <div className="space-y-4">
              <div className="bg-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                <p className="text-indigo-200 text-sm mb-1">Saldo Geral</p>
                <p className="text-3xl font-bold">{formatCurrency(totals.accountsBalance)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-emerald-600 text-sm font-medium">Receitas</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.income)}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-rose-500 text-sm font-medium">Despesas</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.expense)}</p>
                </div>
              </div>
           </div>
        )}

        {activeTab === 'accounts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Contas</h2>
              <button onClick={() => setIsAccountModalOpen(true)} className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg text-sm font-medium">+ Nova</button>
            </div>
            {accounts.map(acc => (
              <div key={acc.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <p className="font-medium text-slate-700">{acc.name}</p>
                   <p className="font-bold">{formatCurrency(acc.balance)}</p>
                </div>
                <button onClick={() => handleDelete('accounts', acc.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Cartoes</h2>
              <button onClick={() => setIsCardModalOpen(true)} className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg text-sm font-medium">+ Novo</button>
            </div>
            {cards.map(card => (
              <div key={card.id} className="bg-slate-800 p-5 rounded-2xl text-white shadow-md relative group">
                <button onClick={() => handleDelete('cards', card.id)} className="absolute top-4 right-4 text-slate-500 hover:text-rose-400">
                  <Trash2 size={18} />
                </button>
                <p className="font-medium opacity-80">{card.name}</p>
                <p className="text-lg font-bold">{formatCurrency(card.limit_total)}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Extrato</h2>
            {currentMonthTransactions.map(t => (
              <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                <div className="flex-1">
                  <p className="font-medium text-slate-700">{t.description}</p>
                  <p className="text-[10px] text-slate-400">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className={`font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>{formatCurrency(t.amount)}</p>
                  <button onClick={() => handleDelete('transactions', t.id)} className="text-slate-200 hover:text-rose-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t flex justify-around py-3">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}><Home size={20}/><span className="text-[10px] block">Inicio</span></button>
        <button onClick={() => setActiveTab('transactions')} className={activeTab === 'transactions' ? 'text-indigo-600' : 'text-slate-400'}><ListOrdered size={20}/><span className="text-[10px] block">Extrato</span></button>
        <button onClick={() => setActiveTab('cards')} className={activeTab === 'cards' ? 'text-indigo-600' : 'text-slate-400'}><CreditCard size={20}/><span className="text-[10px] block">Cartoes</span></button>
        <button onClick={() => setActiveTab('accounts')} className={activeTab === 'accounts' ? 'text-indigo-600' : 'text-slate-400'}><Wallet size={20}/><span className="text-[10px] block">Contas</span></button>
      </nav>

      <button onClick={() => setIsTransactionModalOpen(true)} className="fixed bottom-24 right-4 bg-indigo-600 text-white p-4 rounded-full shadow-lg"><Plus /></button>

      {/* MODAIS (Mesma logica anterior) */}
      {isAccountModalOpen && (
        <Modal title="Nova Conta" onClose={() => setIsAccountModalOpen(false)} onSave={handleAddAccount} fields={[{name:'name', label:'Nome', type:'text'}, {name:'balance', label:'Saldo Inicial', type:'number'}]} />
      )}
      {isCardModalOpen && (
        <Modal title="Novo Cartao" onClose={() => setIsCardModalOpen(false)} onSave={handleAddCard} fields={[{name:'name', label:'Nome', type:'text'}, {name:'limit', label:'Limite', type:'number'}]} />
      )}
      {isTransactionModalOpen && (
        <TransactionForm onClose={() => setIsTransactionModalOpen(false)} onSave={handleAddTransaction} accounts={accounts} cards={cards} />
      )}
    </div>
  );
}

// COMPONENTES AUXILIARES (MODAL E FORM)
function Modal({ title, onClose, onSave, fields }) {
  const [data, setData] = useState({});
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        {fields.map(f => (
          <div key={f.name} className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{f.label}</label>
            <input type={f.type} className="w-full border rounded-xl px-4 py-2" onChange={e => setData({...data, [f.name]: e.target.value})} />
          </div>
        ))}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 bg-slate-100 rounded-xl">Cancelar</button>
          <button onClick={() => onSave(data)} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl">Salvar</button>
        </div>
      </div>
    </div>
  );
}

function TransactionForm({ onClose, onSave, accounts, cards }) {
  const [type, setType] = useState('expense');
  const [data, setData] = useState({ date: new Date().toISOString().split('T')[0] });
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-4">Novo Lancamento</h3>
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
          <button onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg ${type === 'expense' ? 'bg-white text-rose-600 shadow' : ''}`}>Despesa</button>
          <button onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg ${type === 'income' ? 'bg-white text-emerald-600 shadow' : ''}`}>Receita</button>
          <button onClick={() => setType('credit_card')} className={`flex-1 py-2 rounded-lg ${type === 'credit_card' ? 'bg-white text-amber-600 shadow' : ''}`}>Cartao</button>
        </div>
        <input type="number" placeholder="Valor" className="w-full border rounded-xl px-4 py-2 mb-4" onChange={e => setData({...data, amount: e.target.value, type})} />
        <input type="text" placeholder="Descricao" className="w-full border rounded-xl px-4 py-2 mb-4" onChange={e => setData({...data, description: e.target.value})} />
        <input type="date" value={data.date} className="w-full border rounded-xl px-4 py-2 mb-4" onChange={e => setData({...data, date: e.target.value})} />
        {type !== 'credit_card' ? (
          <select className="w-full border rounded-xl px-4 py-2 mb-4" onChange={e => setData({...data, accountId: e.target.value})}>
            <option value="">Selecionar Conta</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        ) : (
          <select className="w-full border rounded-xl px-4 py-2 mb-4" onChange={e => setData({...data, cardId: e.target.value})}>
            <option value="">Selecionar Cartao</option>
            {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <button onClick={() => onSave(data)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Confirmar</button>
      </div>
    </div>
  );
}