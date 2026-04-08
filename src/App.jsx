import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, 
  CreditCard, 
  Wallet, 
  ListOrdered, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  X,
  Landmark
} from 'lucide-react';

// --- Utilitarios ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const getMonthYearString = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthYear = (monthYearStr) => {
  const [year, month] = monthYearStr.split('-');
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
};

// --- Componente Principal ---
export default function App() {
  // --- Estados da Aplicacao (Em Memoria) ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [expandedCardId, setExpandedCardId] = useState(null);
  
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Estados dos Modais
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  const currentMonthStr = getMonthYearString(currentMonthDate);

  // --- Navegacao de Meses ---
  const prevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  // --- Logica de Negocio ---
  const handleAddAccount = (account) => {
    setAccounts([...accounts, { ...account, id: generateId(), balance: Number(account.balance) }]);
    setIsAccountModalOpen(false);
  };

  const handleAddCard = (card) => {
    setCards([...cards, { ...card, id: generateId(), limit: Number(card.limit) }]);
    setIsCardModalOpen(false);
  };

  const handleAddTransaction = (data) => {
    const newTransactions = [];
    const baseDateStr = data.date; 
    const baseDateObj = new Date(`${baseDateStr}T12:00:00`);

    if (data.type === 'credit_card') {
      const amount = Number(data.amount);
      const installments = Number(data.installments) || 1;

      if (installments > 1) {
        const installmentValue = amount / installments;
        for (let i = 0; i < installments; i++) {
          const instDate = new Date(baseDateObj);
          instDate.setMonth(instDate.getMonth() + i);
          
          newTransactions.push({
            id: generateId(),
            type: 'credit_card',
            amount: installmentValue,
            description: `${data.description} (${i + 1}/${installments})`,
            date: instDate.toISOString().split('T')[0],
            cardId: data.cardId,
            groupId: data.id
          });
        }
      } else if (data.isRecurring) {
        for (let i = 0; i < 24; i++) {
          const recDate = new Date(baseDateObj);
          recDate.setMonth(recDate.getMonth() + i);
          
          newTransactions.push({
            id: generateId(),
            type: 'credit_card',
            amount: amount,
            description: data.description,
            date: recDate.toISOString().split('T')[0],
            cardId: data.cardId,
            isRecurring: true
          });
        }
      } else {
        newTransactions.push({ ...data, id: generateId(), amount });
      }
    } else {
      const amount = Number(data.amount);
      newTransactions.push({ ...data, id: generateId(), amount });
      
      setAccounts(prev => prev.map(acc => {
        if (acc.id === data.accountId) {
          return {
            ...acc,
            balance: acc.balance + (data.type === 'income' ? amount : -amount)
          };
        }
        return acc;
      }));
    }

    setTransactions([...transactions, ...newTransactions]);
    setIsTransactionModalOpen(false);
  };

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(currentMonthStr));
  }, [transactions, currentMonthStr]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let creditCard = 0;

    currentMonthTransactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      if (t.type === 'expense') expense += t.amount;
      if (t.type === 'credit_card') creditCard += t.amount;
    });

    const accountsBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

    return { income, expense, creditCard, accountsBalance };
  }, [currentMonthTransactions, accounts]);

  const renderDashboard = () => (
    <div className="space-y-4">
      <div className="bg-indigo-600 rounded-2xl p-5 text-white shadow-lg">
        <h2 className="text-indigo-200 text-sm font-medium mb-1">Saldo Geral (Contas)</h2>
        <p className="text-3xl font-bold">{formatCurrency(totals.accountsBalance)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center space-x-2 text-emerald-600 mb-2">
            <TrendingUp size={20} />
            <span className="text-sm font-medium">Receitas</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{formatCurrency(totals.income)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center space-x-2 text-rose-500 mb-2">
            <TrendingDown size={20} />
            <span className="text-sm font-medium">Despesas</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{formatCurrency(totals.expense)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
         <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-amber-500">
              <CreditCard size={20} />
              <span className="text-sm font-medium">Faturas do Mes</span>
            </div>
            <p className="text-xl font-bold text-slate-800">{formatCurrency(totals.creditCard)}</p>
         </div>
         {cards.map(card => {
           const cardTotal = currentMonthTransactions
             .filter(t => t.type === 'credit_card' && t.cardId === card.id)
             .reduce((sum, t) => sum + t.amount, 0);
           
           return (
             <div key={card.id} className="flex justify-between items-center py-2 border-t border-slate-50 text-sm">
               <span className="text-slate-600">{card.name}</span>
               <span className="font-semibold">{formatCurrency(cardTotal)}</span>
             </div>
           );
         })}
      </div>
    </div>
  );

  const renderTransactions = () => {
    const accountTransactions = currentMonthTransactions.filter(t => t.type !== 'credit_card');

    return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800">Extrato de Contas</h2>
      {accountTransactions.length === 0 ? (
        <p className="text-center text-slate-500 py-8">Nenhum lancamento nas contas neste mes.</p>
      ) : (
        <div className="space-y-3">
          {accountTransactions.sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => (
            <div key={t.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${
                  t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                }`}>
                  {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{t.description}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(`${t.date}T12:00:00`).toLocaleDateString('pt-BR')} 
                  </p>
                </div>
              </div>
              <p className={`font-bold ${
                t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )};

  const renderCards = () => {
    const totalInvoicesMonth = currentMonthTransactions
      .filter(t => t.type === 'credit_card')
      .reduce((sum, t) => sum + t.amount, 0);

    return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Meus Cartoes</h2>
        <button 
          onClick={() => setIsCardModalOpen(true)}
          className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          + Adicionar
        </button>
      </div>
      
      <div className="bg-amber-500 rounded-2xl p-5 text-white shadow-lg mb-6">
        <h2 className="text-amber-100 text-sm font-medium mb-1">Total Faturas ({formatMonthYear(currentMonthStr)})</h2>
        <p className="text-3xl font-bold">{formatCurrency(totalInvoicesMonth)}</p>
      </div>

      {cards.map(card => {
        const cardTransactionsThisMonth = currentMonthTransactions.filter(t => t.type === 'credit_card' && t.cardId === card.id);
        const invoiceTotal = cardTransactionsThisMonth.reduce((sum, t) => sum + t.amount, 0);

        const currentMonthThreshold = `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, '0')}-00`;
        const futureAndCurrentTransactions = transactions.filter(t => t.type === 'credit_card' && t.cardId === card.id && t.date > currentMonthThreshold);
        const limitConsumed = futureAndCurrentTransactions.reduce((sum, t) => sum + t.amount, 0);
        const availableLimit = card.limit - limitConsumed;
        const isExpanded = expandedCardId === card.id;

        return (
          <div key={card.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300">
            <div 
              className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 text-white cursor-pointer hover:opacity-95"
              onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="font-medium tracking-wider">{card.name}</span>
                <CreditCard size={24} className="text-slate-400" />
              </div>
              <div className="flex justify-between items-end mt-4">
                <div>
                  <p className="text-slate-400 text-xs mb-1">Limite Liberado</p>
                  <p className="text-lg font-semibold text-emerald-400">{formatCurrency(availableLimit)}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs mb-1">Fatura Atual</p>
                  <p className="text-xl font-bold text-amber-400">{formatCurrency(invoiceTotal)}</p>
                </div>
              </div>
              <div className="mt-4 text-center border-t border-slate-700 pt-2 opacity-70">
                <span className="text-[10px] uppercase tracking-widest">{isExpanded ? 'Ocultar despesas' : 'Clique para ver despesas'}</span>
              </div>
            </div>

            {isExpanded && (
              <div className="p-4 bg-slate-50">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                  <ListOrdered size={14} /> Despesas nesta fatura
                </h4>
                {cardTransactionsThisMonth.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Nenhuma despesa nesta fatura.</p>
                ) : (
                  <div className="space-y-2">
                    {cardTransactionsThisMonth.sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => (
                      <div key={t.id} className="flex justify-between items-center text-sm p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div>
                          <p className="font-medium text-slate-700">{t.description} {t.isRecurring && '🔄'}</p>
                          <p className="text-[10px] text-slate-400">{new Date(`${t.date}T12:00:00`).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <span className="font-semibold text-amber-600">{formatCurrency(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  )};

  const renderAccounts = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Minhas Contas</h2>
        <button 
          onClick={() => setIsAccountModalOpen(true)}
          className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          + Adicionar
        </button>
      </div>

      {accounts.map(acc => (
        <div key={acc.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
              <Landmark size={24} />
            </div>
            <div>
              <p className="font-medium text-slate-800">{acc.name}</p>
              <p className="text-sm text-slate-500">Saldo atual</p>
            </div>
          </div>
          <p className="text-lg font-bold text-slate-800">{formatCurrency(acc.balance)}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-900 selection:bg-indigo-100">
      
      <header className="bg-white sticky top-0 z-10 px-4 py-4 shadow-sm rounded-b-2xl mb-4 flex justify-between items-center">
        <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-full transition">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold text-slate-800 capitalize">
          {formatMonthYear(currentMonthStr)}
        </h1>
        <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-full transition">
          <ChevronRight size={24} />
        </button>
      </header>

      <main className="px-4 max-w-lg mx-auto">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'cards' && renderCards()}
        {activeTab === 'accounts' && renderAccounts()}
      </main>

      <button 
        onClick={() => setIsTransactionModalOpen(true)}
        className="fixed bottom-24 right-4 sm:right-1/2 sm:translate-x-[200px] bg-indigo-600 text-white p-4 rounded-full shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all z-20"
      >
        <Plus size={28} />
      </button>

      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around items-center py-3 px-2 z-10 sm:max-w-md sm:left-1/2 sm:-translate-x-1/2 sm:rounded-t-3xl sm:border-x">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Home />} label="Inicio" />
        <NavButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<ListOrdered />} label="Extrato" />
        <NavButton active={activeTab === 'cards'} onClick={() => setActiveTab('cards')} icon={<CreditCard />} label="Cartoes" />
        <NavButton active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')} icon={<Wallet />} label="Contas" />
      </nav>

      <TransactionModal 
        isOpen={isTransactionModalOpen} 
        onClose={() => setIsTransactionModalOpen(false)} 
        onSave={handleAddTransaction}
        accounts={accounts}
        cards={cards}
      />
      <AccountModal 
        isOpen={isAccountModalOpen} 
        onClose={() => setIsAccountModalOpen(false)} 
        onSave={handleAddAccount} 
      />
      <CardModal 
        isOpen={isCardModalOpen} 
        onClose={() => setIsCardModalOpen(false)} 
        onSave={handleAddCard} 
      />

    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 space-y-1 transition-colors ${active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
      <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform`}>
        {React.cloneElement(icon, { size: active ? 24 : 22, strokeWidth: active ? 2.5 : 2 })}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function ModalLayout({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full"><X size={24} /></button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function TransactionModal({ isOpen, onClose, onSave, accounts, cards }) {
  const [type, setType] = useState('expense'); 
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [cardId, setCardId] = useState(cards[0]?.id || '');
  
  const [installments, setInstallments] = useState(1);
  const [isRecurring, setIsRecurring] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setInstallments(1);
      setIsRecurring(false);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !description) return;

    onSave({
      type,
      amount: parseFloat(amount),
      description,
      date,
      ...(type !== 'credit_card' ? { accountId } : { cardId, installments, isRecurring })
    });
  };

  return (
    <ModalLayout isOpen={isOpen} onClose={onClose} title="Novo Lancamento">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${type === 'expense' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500'}`}>Despesa</button>
          <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${type === 'income' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}>Receita</button>
          <button type="button" onClick={() => setType('credit_card')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${type === 'credit_card' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500'}`}>Cartao</button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Valor (R$)</label>
          <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Descricao</label>
          <input type="text" required value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Mercado, Internet..." />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Data</label>
          <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        {type !== 'credit_card' ? (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Conta</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Cartao de Credito</label>
              <select value={cardId} onChange={e => setCardId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Parcelas</label>
                <input type="number" min="1" max="48" value={installments} onChange={e => {setInstallments(e.target.value); if(e.target.value > 1) setIsRecurring(false)}} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled={isRecurring} />
              </div>
              <div className="flex-[1.5] flex items-center pt-5">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={isRecurring} onChange={e => {setIsRecurring(e.target.checked); if(e.target.checked) setInstallments(1)}} className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" disabled={installments > 1} />
                  <span className="text-sm font-medium text-slate-700">Assinatura Recorrente</span>
                </label>
              </div>
            </div>
          </>
        )}

        <button type="submit" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-indigo-200">
          Salvar Lancamento
        </button>
      </form>
    </ModalLayout>
  );
}

function AccountModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, balance: parseFloat(balance) });
    setName(''); setBalance('');
  };

  return (
    <ModalLayout isOpen={isOpen} onClose={onClose} title="Nova Conta">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nome da Conta</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Nubank, Itau..." />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Saldo Inicial (R$)</label>
          <input type="number" step="0.01" required value={balance} onChange={e => setBalance(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00" />
        </div>
        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition">
          Cadastrar Conta
        </button>
      </form>
    </ModalLayout>
  );
}

function CardModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, limit: parseFloat(limit) });
    setName(''); setLimit('');
  };

  return (
    <ModalLayout isOpen={isOpen} onClose={onClose} title="Novo Cartao de Credito">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nome do Cartao</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Visa Platinum..." />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Limite Total (R$)</label>
          <input type="number" step="0.01" required value={limit} onChange={e => setLimit(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00" />
        </div>
        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition">
          Cadastrar Cartao
        </button>
      </form>
    </ModalLayout>
  );
}