document.getElementById("profilePic").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    const container = document.querySelector(".file-upload");
  
    reader.onload = function (e) {
      const existingPreview = container.querySelector("#file-preview");
      if (existingPreview) existingPreview.remove();
  
      const preview = document.createElement("img");
      preview.id = "file-preview";
      preview.className = "file-preview";
      preview.src = e.target.result;
      container.appendChild(preview);
    };
  
    reader.readAsDataURL(file);
  });
  
  document.getElementById("resumeForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const submitBtn = document.querySelector(".generate-btn");
    const spinner = document.querySelector(".loading-spinner");
    const btnText = document.querySelector(".btn-text");
  
    submitBtn.disabled = true;
    btnText.classList.add("hidden");
    spinner.classList.remove("hidden");
  
    try {
      const formData = new FormData(this);
      if (!formData.get("name") || !formData.get("email") || !formData.get("skills")) {
        throw new Error("Please fill in all required fields");
      }
  
      const response = await fetch("/generate-resume", {
        method: "POST",
        body: formData,
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Server error");
      }
  
      const result = await response.json();
      if (result.success) {
        window.open(result.pdfUrl, "_blank");
      }
    } catch (error) {
      const errorDiv = document.createElement("div");
      errorDiv.className = "error-message";
      errorDiv.textContent = error.message;
      this.appendChild(errorDiv);
    } finally {
      submitBtn.disabled = false;
      btnText.classList.remove("hidden");
      spinner.classList.add("hidden");
    }
  });