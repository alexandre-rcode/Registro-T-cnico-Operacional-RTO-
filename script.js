document.addEventListener('DOMContentLoaded', () => {
  const reportForm = document.getElementById('reportForm');
  const textoRelatorioInput = document.getElementById('textoRelatorio');
  const colaboradorNomeInput = document.getElementById('colaboradorNome');
  const relatoriosContainer = document.getElementById('relatoriosContainer');
  const statusFilterButtons = document.querySelectorAll('.status-filter .btn');
  const currentYearSpan = document.getElementById('currentYear');

  // Modal elements
  const deleteModal = document.getElementById('deleteModal');
  const closeModalButton = deleteModal.querySelector('.close-button');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  let reportIdToDelete = null;
  let currentFilter = 'todos';

  console.log("SCRIPT: Iniciando Sistema de Relatórios");
  console.log("SCRIPT: Tentando carregar relatórios do localStorage com a chave 'relatoriosSistemaProf'");
  let relatorios = [];
  try {
    const relatoriosSalvos = localStorage.getItem('relatoriosSistemaProf');
    if (relatoriosSalvos) {
      relatorios = JSON.parse(relatoriosSalvos);
      console.log("SCRIPT: Relatórios carregados do localStorage:", JSON.parse(JSON.stringify(relatorios)));
    } else {
      console.log("SCRIPT: Nenhum relatório encontrado no localStorage. Iniciando com array vazio.");
    }
  } catch (error) {
    console.error("SCRIPT: Erro ao carregar ou parsear relatórios do localStorage:", error);
    relatorios = []; 
  }

  const salvarRelatorios = () => {
    try {
      console.log("SCRIPT: Tentando salvar relatórios. Estado atual:", JSON.parse(JSON.stringify(relatorios)));
      localStorage.setItem('relatoriosSistemaProf', JSON.stringify(relatorios));
      console.log("SCRIPT: Relatórios salvos com sucesso no localStorage.");
    } catch (error) {
      console.error("SCRIPT: Erro ao salvar relatórios no localStorage:", error);
      alert("Ocorreu um erro ao tentar salvar os relatórios. Verifique o console para mais detalhes.");
    }
  };

  const formatarData = (isoString) => {
    if (!isoString) return 'Data indisponível';
    try {
        const data = new Date(isoString);
        return data.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        console.error("Erro ao formatar data:", e, "Valor recebido:", isoString);
        return 'Data inválida';
    }
  };
  
  const escapeHTML = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, function (match) {
        return {
            '&': '&', '<': '<', '>': '>',
            '"': '"', "'": '''
        }[match];
    });
  };

  const renderizarRelatorios = () => {
    relatoriosContainer.innerHTML = ''; 
    const relatoriosFiltrados = relatorios.filter(relatorio => {
      if (currentFilter === 'todos') return true;
      return relatorio.status === currentFilter;
    });

    if (relatorios.length === 0) {
        relatoriosContainer.innerHTML = `<p class="empty-message"><i class="fas fa-folder-open"></i> Nenhum relatório cadastrado ainda. Crie o primeiro!</p>`;
        return;
    }
    if (relatoriosFiltrados.length === 0) {
        relatoriosContainer.innerHTML = `<p class="empty-message"><i class="fas fa-search-minus"></i> Nenhum relatório encontrado para o filtro "${currentFilter}".</p>`;
        return;
    }

    relatoriosFiltrados.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); 

    relatoriosFiltrados.forEach(relatorio => {
      const reportCard = document.createElement('div');
      reportCard.className = 'report-card';
      reportCard.dataset.id = relatorio.id;
      reportCard.dataset.status = relatorio.status;
      reportCard.setAttribute('role', 'article');
      reportCard.setAttribute('aria-labelledby', `report-title-${relatorio.id}`);


      const authorText = relatorio.colaborador ? `<p class="report-author">Criado por: ${escapeHTML(relatorio.colaborador)}</p>` : '';
      const safeRelatorioText = escapeHTML(relatorio.texto).replace(/\n/g, '<br>');

      reportCard.innerHTML = `
        <div class="report-content">
          <div class="report-text" id="report-title-${relatorio.id}">${safeRelatorioText}</div>
          ${authorText}
        </div>
        <div class="report-status">
          <label for="status-${relatorio.id}" class="sr-only">Status do Relatório</label>
          <select id="status-${relatorio.id}" title="Mudar status do relatório">
            <option value="pendente" ${relatorio.status === 'pendente' ? 'selected' : ''}>Pendente</option>
            <option value="andamento" ${relatorio.status === 'andamento' ? 'selected' : ''}>Em Andamento</option>
            <option value="resolvido" ${relatorio.status === 'resolvido' ? 'selected' : ''}>Resolvido</option>
            <option value="nao_resolvido" ${relatorio.status === 'nao_resolvido' ? 'selected' : ''}>Não Resolvido</option>
          </select>
        </div>
        <div class="report-actions">
          <button class="btn btn-edit" aria-label="Editar relatório ${relatorio.id}"><i class="fas fa-edit"></i> Editar</button>
          <button class="btn btn-delete" aria-label="Excluir relatório ${relatorio.id}"><i class="fas fa-trash-alt"></i> Excluir</button>
        </div>
        <div class="report-timestamp">
          Criado: ${formatarData(relatorio.createdAt)}
          ${relatorio.updatedAt ? `<br>Atualizado: ${formatarData(relatorio.updatedAt)}` : ''}
        </div>
      `;

      const selectStatus = reportCard.querySelector('select');
      selectStatus.addEventListener('change', (e) => {
        mudarStatusRelatorio(relatorio.id, e.target.value);
      });

      const editButton = reportCard.querySelector('.btn-edit');
      editButton.addEventListener('click', () => {
        iniciarEdicao(reportCard, relatorio.id);
      });

      const deleteButton = reportCard.querySelector('.btn-delete');
      deleteButton.addEventListener('click', () => {
        abrirModalExclusao(relatorio.id);
      });

      relatoriosContainer.appendChild(reportCard);
    });
  };
  
  reportForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = textoRelatorioInput.value.trim();
    const colaborador = colaboradorNomeInput.value.trim() || "Anônimo";

    // Limpar feedback de erro anterior
    textoRelatorioInput.style.borderColor = 'var(--border-color)';
    textoRelatorioInput.placeholder = "Digite os detalhes do seu relatório aqui...";


    if (!texto) {
      textoRelatorioInput.style.borderColor = 'var(--danger-color)';
      textoRelatorioInput.placeholder = "O texto do relatório não pode estar vazio!";
      textoRelatorioInput.focus();
      // Remover o feedback após um tempo, se desejar, mas o foco já ajuda.
      // setTimeout(() => {
      //     textoRelatorioInput.style.borderColor = 'var(--border-color)';
      //     textoRelatorioInput.placeholder = "Digite os detalhes do seu relatório aqui...";
      // }, 3000);
      return;
    }

    const novoRelatorio = {
      id: Date.now(),
      texto: texto,
      colaborador: colaborador,
      status: 'pendente',
      createdAt: new Date().toISOString(),
      updatedAt: null
    };

    console.log("SCRIPT: Novo relatório a ser adicionado:", novoRelatorio);
    relatorios.push(novoRelatorio);
    console.log("SCRIPT: Array 'relatorios' após push:", JSON.parse(JSON.stringify(relatorios)));
    
    salvarRelatorios();
    renderizarRelatorios();

    textoRelatorioInput.value = '';
    // colaboradorNomeInput.value = ''; // Descomente se quiser limpar o nome também
    textoRelatorioInput.focus();
  });

  const mudarStatusRelatorio = (id, novoStatus) => {
    relatorios = relatorios.map(r =>
      r.id === id ? { ...r, status: novoStatus, updatedAt: new Date().toISOString() } : r
    );
    salvarRelatorios();
    renderizarRelatorios(); 
  };

  const iniciarEdicao = (reportCard, id) => {
    // Se já existe um modo de edição em outro card, cancela-o primeiro
    const existingEditing = document.querySelector('.report-text-editing');
    if (existingEditing && existingEditing.closest('.report-card').dataset.id !== String(id)) {
        renderizarRelatorios(); // Re-renderiza tudo para cancelar outras edições
    }


    const reportContentDiv = reportCard.querySelector('.report-content');
    const reportTextDiv = reportCard.querySelector('.report-text');
    const actionsDiv = reportCard.querySelector('.report-actions');
    const originalRelatorio = relatorios.find(r => r.id === id);
    if (!originalRelatorio) return;
    const originalText = originalRelatorio.texto;

    actionsDiv.style.display = 'none'; // Esconde botões originais

    const editTextArea = document.createElement('textarea');
    editTextArea.className = 'report-text-editing';
    editTextArea.value = originalText;
    editTextArea.rows = Math.max(5, originalText.split('\n').length + 1); // Ajusta altura
    
    reportTextDiv.style.display = 'none';
    reportContentDiv.insertBefore(editTextArea, reportTextDiv); // Insere antes do div de texto original
    editTextArea.focus();
    editTextArea.selectionStart = editTextArea.selectionEnd = editTextArea.value.length; // Cursor no final

    // Cria novos botões de Salvar e Cancelar
    const saveEditButton = document.createElement('button');
    saveEditButton.innerHTML = '<i class="fas fa-save"></i> Salvar';
    saveEditButton.className = 'btn btn-save';
    saveEditButton.setAttribute('aria-label', `Salvar alterações do relatório ${id}`);
    
    const cancelEditButton = document.createElement('button');
    cancelEditButton.innerHTML = '<i class="fas fa-times"></i> Cancelar';
    cancelEditButton.className = 'btn btn-cancel';
    cancelEditButton.setAttribute('aria-label', `Cancelar edição do relatório ${id}`);

    const editActionsDiv = document.createElement('div');
    editActionsDiv.className = 'report-actions editing-actions';
    editActionsDiv.appendChild(saveEditButton);
    editActionsDiv.appendChild(cancelEditButton);
    
    reportCard.insertBefore(editActionsDiv, actionsDiv.nextSibling);

    saveEditButton.addEventListener('click', () => {
      const novoTexto = editTextArea.value.trim();
      if (novoTexto && novoTexto !== originalText) {
        salvarEdicao(id, novoTexto);
      } else if (!novoTexto) {
        // Tratar caso de texto vazio na edição se necessário, ou apenas cancelar
        renderizarRelatorios(); // Cancela se texto vazio
      }
      else {
        renderizarRelatorios(); // Se não mudou, apenas volta ao normal
      }
    });

    cancelEditButton.addEventListener('click', () => {
      renderizarRelatorios(); // Restaura a visualização original
    });
  };

  const salvarEdicao = (id, novoTexto) => {
    relatorios = relatorios.map(r =>
      r.id === id ? { ...r, texto: novoTexto, updatedAt: new Date().toISOString() } : r
    );
    salvarRelatorios();
    renderizarRelatorios();
  };

  const abrirModalExclusao = (id) => {
    reportIdToDelete = id;
    deleteModal.style.display = 'flex'; // Usar flex para centralizar
    confirmDeleteBtn.focus(); // Foco no botão de confirmação
  };

  const fecharModalExclusao = () => {
    deleteModal.style.display = 'none';
    reportIdToDelete = null;
  };

  closeModalButton.addEventListener('click', fecharModalExclusao);
  cancelDeleteBtn.addEventListener('click', fecharModalExclusao);

  confirmDeleteBtn.addEventListener('click', () => {
    if (reportIdToDelete !== null) {
      console.log("SCRIPT: Excluindo relatório com ID:", reportIdToDelete);
      relatorios = relatorios.filter(r => r.id !== reportIdToDelete);
      salvarRelatorios();
      renderizarRelatorios();
      fecharModalExclusao();
    }
  });

  window.addEventListener('click', (event) => {
    if (event.target === deleteModal) {
      fecharModalExclusao();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && deleteModal.style.display === 'flex') {
        fecharModalExclusao();
    }
  });

  statusFilterButtons.forEach(button => {
    button.addEventListener('click', () => {
      statusFilterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      currentFilter = button.dataset.filter;
      console.log("SCRIPT: Filtro alterado para:", currentFilter);
      renderizarRelatorios();
    });
  });
  
  // Atualizar ano no footer
  if(currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
  }

  // Inicialização
  if (statusFilterButtons.length > 0) {
      const todosButton = Array.from(statusFilterButtons).find(btn => btn.dataset.filter === 'todos');
      if (todosButton) todosButton.classList.add('active');
  }
  renderizarRelatorios();
});
