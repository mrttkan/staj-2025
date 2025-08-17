// Global Security Script - Password Manager Blocking
(function() {
    'use strict';
    
    // Block common password manager detection
    const blockPasswordManagers = () => {
        // Remove known password manager injections
        const removeElements = [
            '[data-lastpass-icon-root]',
            '[data-dashlane-root]',
            '[data-1password-root]',
            '[data-bitwarden-root]',
            '.lastpass-icon',
            '.dashlane-icon',
            '.onepassword-icon',
            '.bitwarden-icon'
        ];
        
        removeElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
        
        // Reset password field attributes
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            // Remove manager-specific attributes
            const managersAttrs = [
                'data-lastpass-icon-root',
                'data-dashlane-rid',
                'data-1password-uuid',
                'data-bitwarden-watching'
            ];
            
            managersAttrs.forEach(attr => {
                if (input.hasAttribute(attr)) {
                    input.removeAttribute(attr);
                }
            });
            
            // Reset styling
            input.style.backgroundImage = 'none !important';
            input.style.paddingRight = '10px';
        });
    };
    
    // Override autofill detection
    const overrideAutofill = () => {
        Object.defineProperty(HTMLInputElement.prototype, 'autocomplete', {
            set: function(value) {
                if (this.type === 'password') {
                    this.setAttribute('autocomplete', 'new-password');
                } else {
                    this.setAttribute('autocomplete', value);
                }
            },
            get: function() {
                if (this.type === 'password') {
                    return 'new-password';
                }
                return this.getAttribute('autocomplete');
            }
        });
    };
    
    // Block password manager events
    const blockManagerEvents = () => {
        document.addEventListener('DOMNodeInserted', function(e) {
            const target = e.target;
            if (target.nodeType === 1) { // Element node
                // Check for password manager injections
                const managerSelectors = [
                    'data-lastpass-icon-root',
                    'data-dashlane-root',
                    'data-1password-root'
                ];
                
                managerSelectors.forEach(attr => {
                    if (target.hasAttribute && target.hasAttribute(attr)) {
                        target.remove();
                    }
                });
            }
        });
    };
    
    // Initialize security measures
    const init = () => {
        overrideAutofill();
        blockManagerEvents();
        
        // Run blocking continuously
        setInterval(blockPasswordManagers, 50);
        
        // Initial run
        blockPasswordManagers();
    };
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Also run on focus/blur events
    document.addEventListener('focusin', blockPasswordManagers);
    document.addEventListener('focusout', blockPasswordManagers);
    
})();












