import React from 'react';

// Standart Buton Props Interface
interface StandardButtonProps {
  action: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
  title?: string;
}

// Standart Buton Bileşeni
export const StandardButton: React.FC<StandardButtonProps> = ({
  action,
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  disabled = false,
  onClick,
  children,
  className = '',
  title
}) => {
  const getButtonClasses = () => {
    const baseClass = 'crud-btn';
    const variantClass = `btn-${variant}`;
    const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
    const iconClass = iconOnly ? 'btn-icon' : '';
    
    return `${baseClass} ${variantClass} ${sizeClass} ${iconClass} ${className}`.trim();
  };

  const getActionText = () => {
    const actionTexts: { [key: string]: string } = {
      add: 'Ekle',
      edit: 'Düzenle',
      delete: 'Sil',
      save: 'Kaydet',
      cancel: 'İptal',
      view: 'Görüntüle',
      download: 'İndir',
      upload: 'Yükle',
      print: 'Yazdır',
      export: 'Dışa Aktar',
      import: 'İçe Aktar',
      search: 'Ara',
      filter: 'Filtrele',
      refresh: 'Yenile',
      settings: 'Ayarlar',
      help: 'Yardım',
      info: 'Bilgi',
      warning: 'Uyarı',
      error: 'Hata',
      success: 'Başarılı'
    };

    return actionTexts[action] || action;
  };

  return (
    <button
      className={getButtonClasses()}
      data-action={action}
      disabled={disabled}
      onClick={onClick}
      title={title || getActionText()}
    >
      {children || <span className="btn-text">{getActionText()}</span>}
    </button>
  );
};

// Özel Buton Bileşenleri
export const AddButton: React.FC<Omit<StandardButtonProps, 'action'> & { text?: string }> = (props) => (
  <StandardButton action="add" {...props}>
    {props.children || <span className="btn-text">{props.text || 'Ekle'}</span>}
  </StandardButton>
);

export const EditButton: React.FC<Omit<StandardButtonProps, 'action'> & { text?: string }> = (props) => (
  <StandardButton action="edit" variant="warning" {...props}>
    {props.children || <span className="btn-text">{props.text || 'Düzenle'}</span>}
  </StandardButton>
);

export const DeleteButton: React.FC<Omit<StandardButtonProps, 'action'> & { text?: string }> = (props) => (
  <StandardButton action="delete" variant="danger" {...props}>
    {props.children || <span className="btn-text">{props.text || 'Sil'}</span>}
  </StandardButton>
);

export const SaveButton: React.FC<Omit<StandardButtonProps, 'action'> & { text?: string }> = (props) => (
  <StandardButton action="save" variant="success" {...props}>
    {props.children || <span className="btn-text">{props.text || 'Kaydet'}</span>}
  </StandardButton>
);

export const CancelButton: React.FC<Omit<StandardButtonProps, 'action'> & { text?: string }> = (props) => (
  <StandardButton action="cancel" variant="secondary" {...props}>
    {props.children || <span className="btn-text">{props.text || 'İptal'}</span>}
  </StandardButton>
);

export const ViewButton: React.FC<Omit<StandardButtonProps, 'action'> & { text?: string }> = (props) => (
  <StandardButton action="view" variant="info" {...props}>
    {props.children || <span className="btn-text">{props.text || 'Görüntüle'}</span>}
  </StandardButton>
);

export const DownloadButton: React.FC<Omit<StandardButtonProps, 'action'> & { text?: string }> = (props) => (
  <StandardButton action="download" variant="info" {...props}>
    {props.children || <span className="btn-text">{props.text || 'İndir'}</span>}
  </StandardButton>
);

export const UploadButton: React.FC<Omit<StandardButtonProps, 'action'> & { text?: string }> = (props) => (
  <StandardButton action="upload" variant="primary" {...props}>
    {props.children || <span className="btn-text">{props.text || 'Yükle'}</span>}
  </StandardButton>
);

export const PrintButton: React.FC<Omit<StandardButtonProps, 'action'> & { text?: string }> = (props) => (
  <StandardButton action="print" variant="info" {...props}>
    {props.children || <span className="btn-text">{props.text || 'Yazdır'}</span>}
  </StandardButton>
);

export const SearchButton: React.FC<Omit<StandardButtonProps, 'action'> & { text?: string }> = (props) => (
  <StandardButton action="search" variant="primary" {...props}>
    {props.children || <span className="btn-text">{props.text || 'Ara'}</span>}
  </StandardButton>
);

export const FilterButton: React.FC<Omit<StandardButtonProps, 'action'> & { text?: string }> = (props) => (
  <StandardButton action="filter" variant="secondary" {...props}>
    {props.children || <span className="btn-text">{props.text || 'Filtrele'}</span>}
  </StandardButton>
);

export const RefreshButton: React.FC<Omit<StandardButtonProps, 'action'> & { text?: string }> = (props) => (
  <StandardButton action="refresh" variant="info" {...props}>
    {props.children || <span className="btn-text">{props.text || 'Yenile'}</span>}
  </StandardButton>
);

// Buton Grubu Bileşeni
interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  type?: 'crud-actions' | 'action-buttons' | 'payment-actions' | 'customer-actions';
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ 
  children, 
  className = '', 
  type = 'crud-actions' 
}) => {
  return (
    <div className={`${type} ${className}`.trim()}>
      {children}
    </div>
  );
};

// CRUD Buton Grubu
interface CRUDButtonGroupProps {
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  addText?: string;
  editText?: string;
  deleteText?: string;
  viewText?: string;
  size?: 'sm' | 'md' | 'lg';
  showAdd?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  showView?: boolean;
  className?: string;
}

export const CRUDButtonGroup: React.FC<CRUDButtonGroupProps> = ({
  onAdd,
  onEdit,
  onDelete,
  onView,
  addText,
  editText,
  deleteText,
  viewText,
  size = 'md',
  showAdd = true,
  showEdit = true,
  showDelete = true,
  showView = false,
  className = ''
}) => {
  return (
    <ButtonGroup className={className}>
      {showAdd && (
        <AddButton 
          size={size} 
          onClick={onAdd}
          text={addText}
        />
      )}
      {showView && (
        <ViewButton 
          size={size} 
          onClick={onView}
          text={viewText}
        />
      )}
      {showEdit && (
        <EditButton 
          size={size} 
          onClick={onEdit}
          text={editText}
        />
      )}
      {showDelete && (
        <DeleteButton 
          size={size} 
          onClick={onDelete}
          text={deleteText}
        />
      )}
    </ButtonGroup>
  );
};

// Form Buton Grubu
interface FormButtonGroupProps {
  onSave?: () => void;
  onCancel?: () => void;
  saveText?: string;
  cancelText?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const FormButtonGroup: React.FC<FormButtonGroupProps> = ({
  onSave,
  onCancel,
  saveText,
  cancelText,
  size = 'md',
  disabled = false,
  className = ''
}) => {
  return (
    <ButtonGroup className={className}>
      <SaveButton 
        size={size} 
        onClick={onSave}
        text={saveText}
        disabled={disabled}
      />
      <CancelButton 
        size={size} 
        onClick={onCancel}
        text={cancelText}
      />
    </ButtonGroup>
  );
};

// Export tüm bileşenleri
export default {
  StandardButton,
  AddButton,
  EditButton,
  DeleteButton,
  SaveButton,
  CancelButton,
  ViewButton,
  DownloadButton,
  UploadButton,
  PrintButton,
  SearchButton,
  FilterButton,
  RefreshButton,
  ButtonGroup,
  CRUDButtonGroup,
  FormButtonGroup
};
