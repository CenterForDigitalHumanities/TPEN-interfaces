export default function checkUserAuthentication() {
    return new Promise((resolve, reject) => {
      function check() {
        if (window.TPEN_USER) {
          const TPEN_USER = window.TPEN_USER;
          resolve(TPEN_USER);   
        } else { 
          setTimeout(check, 100);
        }
      }
      check();
    });
  }