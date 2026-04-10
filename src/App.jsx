import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  Home, CreditCard, Wallet, ListOrdered, Plus, 
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, X, Landmark, Trash2, Calendar, FileText, CheckCircle2, Copy
} from 'lucide-react';

// Utilitários de Formatação
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const getMonthYearString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Modais
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  const currentMonthStr = getMonthYearString(currentMonthDate);

  // Carregamento de Dados
  const fetchData = async () => {
    setLoading(true);
    const { data: accs } = await supabase.from('accounts').select('*').order('name');
    const { data: crds } = await supabase.from('cards').select('*').order('name');
    const { data: trans } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    const { data: blls } = await supabase.from('bills').select('*').order('due_date');
    
    if (accs) setAccounts(accs);
    if (crds) setCards(crds);
    if (trans) setTransactions(trans);
    if (blls) setBills(blls);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Lógica de Cálculos e Saldo Dinâmico
  const totals = useMemo(() => {
    // 1. Calcular Saldo Real de cada Conta (Saldo Inicial + Receitas - Despesas)
    const processedAccounts = accounts.map(acc => {
      const accTrans = transactions.filter(t => t.account_id === acc.id);
      const totalIncome = accTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpense = accTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      return { ...acc, currentBalance: Number(acc.balance) + totalIncome - totalExpense };
    });

    const currentMonthTrans = transactions.filter(t => t.date.startsWith(currentMonthStr));
    
    return {
      accounts: processedAccounts,
      mainBalance: processedAccounts.filter(a => a.account_type !== 'investimento').reduce((sum, a) => sum + a.currentBalance, 0),
      investBalance: processedAccounts.filter(a => a.account_type === 'investimento').reduce((sum, a) => sum + a.currentBalance, 0),
      incomeMonth: currentMonthTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
      expenseMonth: currentMonthTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0),
      cardMonth: currentMonthTrans.filter(t => t.type === 'credit_card').reduce((sum, t) => sum + Number(t.amount), 0)
    };
  }, [accounts, transactions, currentMonthStr]);

  // Operações no Supabase
  const handleAddAccount = async (data) => {
    await supabase.from('accounts').insert([{ name: data.name, balance: Number(data.balance), account_type: data.account_type }]);
    fetchData(); setIsAccountModalOpen(false);
  };

  const handleAddCard = async (data) => {
    const { error } = await supabase.from('cards').insert([{ name: data.name, limit_total: Number(data.limit_total) }]);
    if (error) alert("Erro: " + error.message);
    else { fetchData(); setIsCardModalOpen(false); }
  };

  const handleAddBill = async (data) => {
    await supabase.from('bills').insert([{ ...data, value: Number(data.value), is_paid: false }]);
    fetchData(); setIsBillModalOpen(false);
  };

  const handleAddTransaction = async (data) => {
    await supabase.from('transactions').insert([{ 
      ...data, 
      amount: Number(data.amount),
      installments: Number(data.installments || 1)
    }]);
    fetchData(); setIsTransactionModalOpen(false);
  };

  const toggleBillPaid = async (bill) => {
    await supabase.from('bills').update({ is_paid: !bill.is_paid }).eq('id', bill.id);
    fetchData();
  };

  const handleDelete = async (table, id) => {
    if(window.confirm("Deseja excluir este item?")) {
      await supabase.from(table).delete().eq('id', id);
      fetchData();
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-black text-indigo-600 animate-pulse">CARREGANDO...</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-28 font-sans text-slate-900">
      {/* Header Fixo */}
      <header className="bg-white sticky top-0 z-40 px-6 py-5 shadow-sm flex justify-between items-center border-b border-slate-100">
        <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1))}><ChevronLeft size={24}/></button>
        <h1 className="text-xl font-black capitalize tracking-tight text-indigo-950">
          {currentMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </h1>
        <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1))}><ChevronRight size={24}/></button>
      </header>

      <main className="px-5 max-w-lg mx-auto mt-6 space-y-8">
        {activeTab === 'dashboard' && (
          <>
            {/* Card Saldo Principal */}
            <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-100">
              <p className="text-indigo-100 text-xs font-black uppercase tracking-widest mb-1">Saldo em Contas</p>
              <p className="text-4xl font-black mb-6">{formatCurrency(totals.mainBalance)}</p>
              <div className="space-y-3 border-t border-indigo-500/50 pt-5">
                {totals.accounts.filter(a => a.account_type !== 'investimento').map(acc => (
                  <div key={acc.id} className="flex justify-between items-center">
                    <span className="text-sm font-medium opacity-80">{acc.name}</span>
                    <span className="text-sm font-black">{formatCurrency(acc.currentBalance)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card Investimentos */}
            <div className="bg-emerald-600 rounded-[2.5rem] p-7 text-white shadow-xl shadow-emerald-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest">Total Investido</p>
                  <p className="text-2xl font-black">{formatCurrency(totals.investBalance)}</p>
                </div>
                <TrendingUp size={24} className="opacity-50"/>
              </div>
              <div className="space-y-1">
                {totals.accounts.filter(a => a.account_type === 'investimento').map(acc => (
                  <p key={acc.id} className="text-xs font-bold opacity-80">{acc.name}: {formatCurrency(acc.currentBalance)}</p>
                ))}
              </div>
            </div>

            {/* Grid Resumo Mes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
                <p className="text-emerald-500 text-[10px] font-black uppercase mb-1">Entradas</p>
                <p className="text-xl font-black">{formatCurrency(totals.incomeMonth)}</p>
              </div>
              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
                <p className="text-rose-500 text-[10px] font-black uppercase mb-1">Saídas</p>
                <p className="text-xl font-black">{formatCurrency(totals.expenseMonth)}</p>
              </div>
            </div>
          </>
        )}

        {activeTab === 'bills' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800">Agenda de Pagamentos</h2>
              <button onClick={() => setIsBillModalOpen(true)} className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg"><Plus size={24}/></button>
            </div>
            {bills.map(bill => (
              <div key={bill.id} className={`bg-white p-5 rounded-3xl shadow-sm border-2 transition-all ${bill.is_paid ? 'border-emerald-100 opacity-50' : 'border-white'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className={`font-black text-lg ${bill.is_paid ? 'line-through text-slate-400' : 'text-slate-800'}`}>{bill.description}</p>
                    <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1">
                      <Calendar size={12}/> Vence: {new Date(bill.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                    {bill.barcode && (
                      <div className="mt-3 flex items-center gap-2 bg-slate-50 p-2 rounded-xl">
                        <p className="text-[9px] font-mono text-slate-500 truncate flex-1">{bill.barcode}</p>
                        <button onClick={() => {navigator.clipboard.writeText(bill.barcode); alert("Copiado!")}} className="text-indigo-600"><Copy size={14}/></button>
                      </div>
                    )}
                  </div>
                  <button onClick={() => toggleBillPaid(bill)} className={`ml-4 transition-colors ${bill.is_paid ? 'text-emerald-500' : 'text-slate-200'}`}>
                    <CheckCircle2 size={36} />
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-[9px] font-black px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full uppercase">{bill.payment_method}</span>
                  <span className="text-lg font-black text-rose-600">{formatCurrency(bill.value)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Listagens de Contas, Cartões e Extrato mantêm a lógica funcional do banco */}
        {activeTab === 'accounts' && (
           <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black">Minhas Contas</h2>
                <button onClick={() => setIsAccountModalOpen(true)} className="bg-indigo-600 text-white px-5 py-2 rounded-2xl text-xs font-black">+ NOVA</button>
             </div>
             {totals.accounts.map(acc => (
               <div key={acc.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><Landmark size={24}/></div>
                    <div>
                      <p className="font-black text-slate-800">{acc.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{acc.account_type}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <p className="font-black text-lg">{formatCurrency(acc.currentBalance)}</p>
                    <button onClick={() => handleDelete('accounts', acc.id)} className="text-slate-200 hover:text-rose-500"><Trash2 size={18}/></button>
                 </div>
               </div>
             ))}
           </div>
        )}

        {activeTab === 'cards' && (
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black">Cartões de Crédito</h2>
                <button onClick={() => setIsCardModalOpen(true)} className="bg-indigo-600 text-white px-5 py-2 rounded-2xl text-xs font-black">+ NOVO</button>
             </div>
             {cards.map(card => (
               <div key={card.id} className="bg-slate-900 p-7 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-10 opacity-5"><CreditCard size={100}/></div>
                 <div className="relative z-10">
                    <div className="flex justify-between items-start mb-10">
                      <p className="font-black tracking-widest text-lg">{card.name.toUpperCase()}</p>
                      <button onClick={() => handleDelete('cards', card.id)} className="text-white/20 hover:text-rose-400"><Trash2 size={20}/></button>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-black opacity-40 uppercase mb-1">Limite do Cartão</p>
                        <p className="text-xl font-black">{formatCurrency(card.limit_total)}</p>
                      </div>
                      <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
                        <CreditCard size={20} className="opacity-50" />
                      </div>
                    </div>
                 </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black">Movimentações</h2>
            {transactions.filter(t => t.date.startsWith(currentMonthStr)).map(t => (
              <div key={t.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
                <div className="flex-1">
                  <p className="font-black text-slate-700">{t.description}</p>
                  <p className="text-[10px] font-bold text-slate-400">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className={`font-black text-lg ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                  <button onClick={() => handleDelete('transactions', t.id)} className="text-slate-200"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Menu Inferior */}
      <nav className="fixed bottom-0 w-full bg-white/80 backdrop-blur-xl border-t border-slate-100 flex justify-around py-5 z-40">
        <NavBtn icon={<Home size={24}/>} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <NavBtn icon={<FileText size={24}/>} active={activeTab === 'bills'} onClick={() => setActiveTab('bills')} />
        <NavBtn icon={<ListOrdered size={24}/>} active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
        <NavBtn icon={<CreditCard size={24}/>} active={activeTab === 'cards'} onClick={() => setActiveTab('cards')} />
        <NavBtn icon={<Wallet size={24}/>} active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')} />
      </nav>

      {/* Botão Global Novo Lançamento */}
      <button onClick={() => setIsTransactionModalOpen(true)} className="fixed bottom-28 right-6 bg-indigo-600 text-white p-5 rounded-3xl shadow-2xl shadow-indigo-300 z-50 active:scale-90 transition-transform"><Plus size={30}/></button>

      {/* --- MODAIS COM BOTÕES DE CANCELAR --- */}
      
      {/* Modal Lançamento */}
      {isTransactionModalOpen && (
        <TransactionModal 
          onClose={() => setIsTransactionModalOpen(false)} 
          onSave={handleAddTransaction} 
          accounts={accounts} 
          cards={cards}
        />
      )}

      {/* Modal Conta */}
      {isAccountModalOpen && (
        <AccountModal 
          onClose={() => setIsAccountModalOpen(false)} 
          onSave={handleAddAccount}
        />
      )}

      {/* Modal Cartão */}
      {isCardModalOpen && (
        <CardModal 
          onClose={() => setIsCardModalOpen(false)} 
          onSave={handleAddCard}
        />
      )}

      {/* Modal Boletos */}
      {isBillModalOpen && (
        <BillModal 
          onClose={() => setIsBillModalOpen(false)} 
          onSave={handleAddBill}
        />
      )}
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function NavBtn({ icon, active, onClick }) {
  return (
    <button onClick={onClick} className={`transition-all duration-300 ${active ? 'text-indigo-600 scale-125' : 'text-slate-300'}`}>
      {icon}
    </button>
  );
}

function TransactionModal({ onClose, onSave, accounts, cards }) {
  const [type, setType] = useState('expense');
  const [data, setData] = useState({ date: new Date().toISOString().split('T')[0], installments: 1 });
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-2xl font-black text-slate-800 mb-8">Novo Lançamento</h3>
        <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] mb-8">
          <button onClick={() => setType('expense')} className={`flex-1 py-3 text-xs font-black rounded-2xl transition-all ${type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>DESPESA</button>
          <button onClick={() => setType('income')} className={`flex-1 py-3 text-xs font-black rounded-2xl transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>RECEITA</button>
          <button onClick={() => setType('credit_card')} className={`flex-1 py-3 text-xs font-black rounded-2xl transition-all ${type === 'credit_card' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}>CARTÃO</button>
        </div>
        
        <div className="space-y-6">
          <input type="number" placeholder="R$ 0,00" className="w-full bg-slate-50 border-none rounded-3xl px-6 py-5 text-3xl font-black text-slate-800 outline-none" onChange={e => setData({...data, amount: e.target.value, type})} />
          <input type="text" placeholder="Descrição" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" onChange={e => setData({...data, description: e.target.value})} />
          <input type="date" value={data.date} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold text-slate-500" onChange={e => setData({...data, date: e.target.value})} />
          
          {type !== 'credit_card' ? (
            <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold text-slate-500 appearance-none" onChange={e => setData({...data, account_id: e.target.value})}>
              <option value="">Escolher Conta</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          ) : (
            <>
              <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold text-slate-500 appearance-none" onChange={e => setData({...data, card_id: e.target.value})}>
                <option value="">Escolher Cartão</option>
                {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="number" placeholder="Número de Parcelas" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" onChange={e => setData({...data, installments: e.target.value})} />
            </>
          )}
        </div>

        <div className="flex gap-4 mt-10">
          <button onClick={onClose} className="flex-1 py-5 text-slate-400 font-black uppercase text-xs tracking-widest">Cancelar</button>
          <button onClick={() => onSave(data)} className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-lg shadow-indigo-100 uppercase text-xs tracking-widest">Confirmar</button>
        </div>
      </div>
    </div>
  );
}

function AccountModal({ onClose, onSave }) {
  const [data, setData] = useState({ account_type: 'corrente' });
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
        <h3 className="text-2xl font-black text-slate-800 mb-8">Nova Conta</h3>
        <div className="space-y-4">
          <input type="text" placeholder="Nome da Instituição" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" onChange={e => setData({...data, name: e.target.value})} />
          <input type="number" placeholder="Saldo Inicial R$" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" onChange={e => setData({...data, balance: e.target.value})} />
          <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold text-slate-500" onChange={e => setData({...data, account_type: e.target.value})}>
            <option value="corrente">Conta Corrente</option>
            <option value="investimento">Investimento</option>
          </select>
        </div>
        <div className="flex gap-4 mt-10">
          <button onClick={onClose} className="flex-1 py-5 text-slate-400 font-black text-xs uppercase">Cancelar</button>
          <button onClick={() => onSave(data)} className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-3xl text-xs uppercase">Salvar</button>
        </div>
      </div>
    </div>
  );
}

function CardModal({ onClose, onSave }) {
  const [data, setData] = useState({});
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
        <h3 className="text-2xl font-black text-slate-800 mb-8">Novo Cartão</h3>
        <div className="space-y-4">
          <input type="text" placeholder="Nome do Cartão" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" onChange={e => setData({...data, name: e.target.value})} />
          <input type="number" placeholder="Limite Total R$" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" onChange={e => setData({...data, limit_total: e.target.value})} />
        </div>
        <div className="flex gap-4 mt-10">
          <button onClick={onClose} className="flex-1 py-5 text-slate-400 font-black text-xs uppercase">Cancelar</button>
          <button onClick={() => onSave(data)} className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-3xl text-xs uppercase">Salvar</button>
        </div>
      </div>
    </div>
  );
}

function BillModal({ onClose, onSave }) {
  const [data, setData] = useState({ due_date: new Date().toISOString().split('T')[0], payment_method: 'boleto' });
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-2xl font-black text-slate-800 mb-8">Nova Conta</h3>
        <div className="space-y-4">
          <input type="text" placeholder="O que pagar? (Ex: Luz)" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" onChange={e => setData({...data, description: e.target.value})} />
          <input type="number" placeholder="Valor R$" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" onChange={e => setData({...data, value: e.target.value})} />
          <input type="date" value={data.due_date} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold text-slate-500" onChange={e => setData({...data, due_date: e.target.value})} />
          <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold text-slate-500" onChange={e => setData({...data, payment_method: e.target.value})}>
            <option value="boleto">Boleto Bancário</option>
            <option value="debito">Débito em Conta</option>
          </select>
          <input type="text" placeholder="Código de Barras" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold text-xs font-mono" onChange={e => setData({...data, barcode: e.target.value})} />
        </div>
        <div className="flex gap-4 mt-10">
          <button onClick={onClose} className="flex-1 py-5 text-slate-400 font-black text-xs uppercase">Cancelar</button>
          <button onClick={() => onSave(data)} className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-3xl text-xs uppercase shadow-lg shadow-indigo-100">Salvar</button>
        </div>
      </div>
    </div>
  );
}