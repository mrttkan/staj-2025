export interface UserPermissions {
  canCreateCustomer: boolean;
  canUpdateCustomer: boolean;
  canDeleteCustomer: boolean;
  canCreatePolicy: boolean;
  canUpdatePolicy: boolean;
  canDeletePolicy: boolean;
  canCreatePayment: boolean;
  canUpdatePayment: boolean;
  canDeletePayment: boolean;
  canCreateClaim: boolean;
  canUpdateClaim: boolean;
  canDeleteClaim: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canManageSystem: boolean;
}

export const getAcentePermissions = (): UserPermissions => {
  return {
    // Müşteri yönetimi - Acente sadece oluşturabilir ve güncelleyebilir, silemez
    canCreateCustomer: true,
    canUpdateCustomer: true,
    canDeleteCustomer: false,
    
    // Poliçe yönetimi - Acente oluşturabilir ve güncelleyebilir, silemez
    canCreatePolicy: true,
    canUpdatePolicy: true,
    canDeletePolicy: false,
    
    // Ödeme yönetimi - Acente oluşturabilir ve güncelleyebilir, silemez
    canCreatePayment: true,
    canUpdatePayment: true,
    canDeletePayment: false,
    
    // Hasar yönetimi - Acente oluşturabilir ve güncelleyebilir, silemez
    canCreateClaim: true,
    canUpdateClaim: true,
    canDeleteClaim: false,
    
    // Raporlar - Acente sadece görüntüleyebilir
    canViewReports: true,
    
    // Kullanıcı ve sistem yönetimi - Acente erişemez
    canManageUsers: false,
    canManageSystem: false
  };
};

export const getAdminPermissions = (): UserPermissions => {
  return {
    // Admin tüm yetkilere sahip
    canCreateCustomer: true,
    canUpdateCustomer: true,
    canDeleteCustomer: true,
    canCreatePolicy: true,
    canUpdatePolicy: true,
    canDeletePolicy: true,
    canCreatePayment: true,
    canUpdatePayment: true,
    canDeletePayment: true,
    canCreateClaim: true,
    canUpdateClaim: true,
    canDeleteClaim: true,
    canViewReports: true,
    canManageUsers: true,
    canManageSystem: true
  };
};

export const getKullaniciPermissions = (): UserPermissions => {
  return {
    // Kullanıcı sadece görüntüleme ve sınırlı işlemler yapabilir
    canCreateCustomer: false,
    canUpdateCustomer: false,
    canDeleteCustomer: false,
    canCreatePolicy: false,
    canUpdatePolicy: false,
    canDeletePolicy: false,
    canCreatePayment: false,
    canUpdatePayment: false,
    canDeletePayment: false,
    canCreateClaim: true, // Hasar bildirimi yapabilir
    canUpdateClaim: false,
    canDeleteClaim: false,
    canViewReports: false,
    canManageUsers: false,
    canManageSystem: false
  };
};

export const getUserPermissions = (userRole: string): UserPermissions => {
  switch (userRole?.toLowerCase()) {
    case 'admin':
      return getAdminPermissions();
    case 'acente':
      return getAcentePermissions();
    case 'kullanici':
      return getKullaniciPermissions();
    default:
      return getKullaniciPermissions(); // Varsayılan olarak en az yetki
  }
};
