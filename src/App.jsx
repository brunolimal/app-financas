import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  Home, CreditCard, Wallet, ListOrdered, Plus, 
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, X, Landmark, Trash2, Calendar, FileText, CheckCircle2, Copy, AlertOctagon
} from 'lucide-react';

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

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  const currentMonthStr = getMonthYearString(currentMonthDate);

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

  const totals = useMemo(() => {
    const processedAccounts = accounts.map(acc => {
      const accTrans = transactions.filter(t => t.account_id === acc.id);
      const income = accTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = accTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      return { ...acc, currentBalance: Number(acc.balance) + income - expense };
    });
    const currentMonthTrans = transactions.filter(t => t.date.startsWith(currentMonthStr));
    return {
      accounts: processedAccounts,
      mainBalance: processedAccounts.filter(a => a.account_type !== 'investimento').reduce((sum, a) => sum + a.currentBalance, 0),
      investBalance: processedAccounts.filter(a => a.account_type === 'investimento').reduce((sum, a) => sum + a.currentBalance, 0),
      incomeMonth: currentMonthTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
      expenseMonth: currentMonthTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0),
    };
  }, [accounts, transactions, currentMonthStr]);

  const handleAddAccount = async (data) => {
    await supabase.from('accounts').insert([{ name: data.name, balance: Number(data.balance), account_type: data.account_type }]);
    fetchData(); setIsAccountModalOpen(false);
  };
  const handleAddCard = async (data) => {
    await supabase.from('cards').insert([{ name: data.name, limit_total: Number(data.limit_total) }]);
    fetchData(); setIsCardModalOpen(false);
  };
  const handleAddBill = async (data) => {
    await supabase.from('bills').insert([{ ...data, value: Number(data.value), is_paid: false }]);
    fetchData(); setIsBillModalOpen(false);
  };
  const handleAddTransaction = async (data) => {
    await supabase.from('transactions').insert([{ ...data, amount: Number(data.amount) }]);
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

  if (loading) return <div className="flex h-screen items-center justify-center font-black text-indigo-600">CARREGANDO...</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-28 font-sans text-slate-900">
      <header className="bg-white sticky top-0 z-40 px-6 py-5 shadow-sm border-b border-slate-100">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
            <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1))}><ChevronLeft size={24}/></button>
            <h1 className="text-xl font-black capitalize tracking-tight text-indigo-950">
              {currentMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h1>
            <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1))}><ChevronRight size={24}/></button>
        </div>
      </header>

      <main className="px-5 max-w-5xl mx-auto mt-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl">
                  <p className="text-indigo-100 text-xs font-black uppercase tracking-widest mb-1">Saldo Disponível</p>
                  <p className="text-4xl font-black mb-6">{formatCurrency(totals.mainBalance)}</p>
                  <div className="space-y-3 border-t border-indigo-500/50 pt-5">
                    {totals.accounts.filter(a => a.account_type !== 'investimento').map(acc => (
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
            <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-xl self-start">
              <p className="text-emerald-100 text-xs font-black uppercase tracking-widest mb-1">Investimentos</p>
              <p className="text-3xl font-black mb-4">{formatCurrency(totals.investBalance)}</p>
              <div className="space-y-2 border-t border-emerald-500 pt-4">
                {totals.accounts.filter(a => a.account_type === 'investimento').map(acc => (
                  <p key={acc.id} className="text-sm font-bold opacity-90">{acc.name}: {formatCurrency(acc.currentBalance)}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bills' && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black">Despesas Fixas</h2>
              <button onClick={() => setIsBillModalOpen(true)} className="bg-indigo-600 text-white p-3 rounded-2xl"><Plus/></button>
            </div>
            {bills.map(bill => (
              <div key={bill.id} className={`bg-white p-5 rounded-3xl shadow-sm border-2 ${bill.is_paid ? 'border-emerald-100 opacity-50' : 'border-white'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-black text-lg text-slate-800">{bill.description}</p>
                    <p className="text-xs font-bold text-slate-400">Vence: {new Date(bill.due_date + 'T12:00:00').toLocaleDateString()}</p>
                    {bill.barcode && (
                      <div className="mt-3 flex items-center gap-2 bg-slate-50 p-2 rounded-xl">
                        <p className="text-[9px] font-mono text-slate-500 truncate flex-1">{bill.barcode}</p>
                        <button onClick={() => {navigator.clipboard.writeText(bill.barcode); alert("Copiado!")}}><Copy size={14}/></button>
                      </div>
                    )}
                  </div>
                  <button onClick={() => toggleBillPaid(bill)} className={bill.is_paid ? 'text-emerald-500' : 'text-slate-200'}><CheckCircle2 size={36} /></button>
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <span className="text-[9px] font-black px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full uppercase">{bill.payment_method}</span>
                  <span className="text-lg font-black text-rose-600">{formatCurrency(bill.value)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-black">Extrato Variável</h2>
            {transactions.filter(t => t.date.startsWith(currentMonthStr)).map(t => (
              <div key={t.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
                <div>
                  <p className="font-black text-slate-700">{t.description}</p>
                  <p className="text-[10px] font-bold text-slate-400">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className={`font-black text-lg ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>{formatCurrency(t.amount)}</p>
                  <button onClick={() => handleDelete('transactions', t.id)} className="text-slate-200 hover:text-rose-500"><Trash2 size={18}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="max-w-2xl mx-auto space-y-4">
             <div className="flex justify-between items-center">
               <h2 className="text-2xl font-black">Contas</h2>
               <button onClick={() => setIsAccountModalOpen(true)} className="bg-indigo-600 text-white px-5 py-2 rounded-2xl text-xs font-black">+ NOVA</button>
             </div>
             {totals.accounts.map(acc => (
               <div key={acc.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><Landmark size={24}/></div>
                    <p className="font-black text-slate-800">{acc.name}</p>
                 </div>
                 <div className="flex items-center gap-4">
                    <p className="font-black text-xl">{formatCurrency(acc.currentBalance)}</p>
                    <button onClick={() => handleDelete('accounts', acc.id)} className="text-slate-200 hover:text-rose-500"><Trash2 size={18}/></button>
                 </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="max-w-2xl mx-auto space-y-4">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black">Cartões</h2>
                <button onClick={() => setIsCardModalOpen(true)} className="bg-indigo-600 text-white px-5 py-2 rounded-2xl text-xs font-black">+ NOVO</button>
             </div>
             {cards.map(card => (
               <div key={card.id} className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-10 opacity-5"><CreditCard size={100}/></div>
                 <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                      <p className="font-black tracking-widest text-lg">{card.name.toUpperCase()}</p>
                      <button onClick={() => handleDelete('cards', card.id)} className="text-white/20 hover:text-rose-400"><Trash2 size={20}/></button>
                    </div>
                    <p className="text-[10px] font-black opacity-40 uppercase mb-1">Limite Total</p>
                    <p className="text-2xl font-black">{formatCurrency(card.limit_total)}</p>
                 </div>
               </div>
             ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 w-full bg-white/80 backdrop-blur-xl border-t border-slate-100 py-5 z-40">
        <div className="max-w-lg mx-auto flex justify-around">
            <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-300'}><Home size={26}/></button>
            <button onClick={() => setActiveTab('bills')} className={activeTab === 'bills' ? 'text-indigo-600' : 'text-slate-300'}><AlertOctagon size={26}/></button>
            <button onClick={() => setActiveTab('transactions')} className={activeTab === 'transactions' ? 'text-indigo-600' : 'text-slate-300'}><ListOrdered size={26}/></button>
            <button onClick={() => setActiveTab('cards')} className={activeTab === 'cards' ? 'text-indigo-600' : 'text-slate-300'}><CreditCard size={26}/></button>
            <button onClick={() => setActiveTab('accounts')} className={activeTab === 'accounts' ? 'text-indigo-600' : 'text-slate-300'}><Wallet size={26}/></button>
        </div>
      </nav>

      <button onClick={() => setIsTransactionModalOpen(true)} className="fixed bottom-28 right-8 bg-indigo-600 text-white p-5 rounded-3xl shadow-2xl z-50"><Plus size={32}/></button>

      {/* MODAL TRANSAÇÃO */}
      {isTransactionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-800 mb-8">Novo Lançamento</h3>
            <div className="space-y-4">
              <input type="number" placeholder="R$ 0,00" className="w-full bg-slate-50 border-none rounded-3xl px-6 py-5 text-3xl font-black text-slate-800 outline-none" id="tAmount" />
              <input type="text" placeholder="Descrição" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" id="tDesc" />
              <input type="date" value={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold text-slate-500" id="tDate" />
              <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold text-slate-500" id="tType">
                <option value="expense">Despesa (Saída)</option>
                <option value="income">Receita (Entrada)</option>
                <option value="credit_card">Compra no Cartão</option>
              </select>
              <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold text-slate-500" id="tAcc">
                <option value="">Escolher Conta ou Cartão</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                {cards.map(c => <option key={c.id} value={c.id}>{c.name} (Cartão)</option>)}
              </select>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setIsTransactionModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs">Cancelar</button>
              <button onClick={() => {
                  const type = document.getElementById('tType').value;
                  const targetId = document.getElementById('tAcc').value;
                  const isCard = cards.some(c => c.id === targetId);
                  handleAddTransaction({
                    amount: document.getElementById('tAmount').value,
                    description: document.getElementById('tDesc').value,
                    date: document.getElementById('tDate').value,
                    type,
                    account_id: isCard ? null : targetId,
                    card_id: isCard ? targetId : null
                  })
              }} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs uppercase">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONTA */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-800 mb-8">Nova Conta</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Nome da Instituição" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" id="accName" />
              <input type="number" placeholder="Saldo Inicial R$" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" id="accBal" />
              <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold text-slate-500" id="accType">
                <option value="corrente">Conta Corrente</option>
                <option value="investimento">Conta de Investimento</option>
              </select>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setIsAccountModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black text-xs">CANCELAR</button>
              <button onClick={() => handleAddAccount({
                name: document.getElementById('accName').value,
                balance: document.getElementById('accBal').value,
                account_type: document.getElementById('accType').value
              })} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs">SALVAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CARTÃO */}
      {isCardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-800 mb-8">Novo Cartão</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Nome do Cartão" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" id="cName" />
              <input type="number" placeholder="Limite Total R$" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" id="cLimit" />
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setIsCardModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black text-xs">CANCELAR</button>
              <button onClick={() => handleAddCard({
                name: document.getElementById('cName').value,
                limit_total: document.getElementById('cLimit').value
              })} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs">SALVAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DESPESAS FIXAS */}
      {isBillModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-black text-slate-800 mb-8">Nova Despesa Fixa</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Ex: Aluguel, Internet..." className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" id="bDesc" />
              <input type="number" placeholder="Valor R$" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" id="bVal" />
              <input type="date" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold text-slate-500" id="bDate" />
              <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold text-slate-500" id="bMethod">
                <option value="boleto">Boleto Bancário</option>
                <option value="debito">Débito em Conta</option>
              </select>
              <input type="text" placeholder="Código de Barras (Opcional)" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold text-xs font-mono" id="bCode" />
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setIsBillModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black text-xs">CANCELAR</button>
              <button onClick={() => handleAddBill({
                description: document.getElementById('bDesc').value,
                value: document.getElementById('bVal').value,
                due_date: document.getElementById('bDate').value,
                payment_method: document.getElementById('bMethod').value,
                barcode: document.getElementById('bCode').value
              })} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs">SALVAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}