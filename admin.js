let token = localStorage.getItem("sheltyAdminToken");
const $ = s => document.querySelector(s);
const api = async (url, opts={}) => {
  opts.headers = {...opts.headers, ...(token ? {Authorization:`Bearer ${token}`} : {})};
  const res = await fetch(url, opts);
  if (res.status === 401) { logout(); throw new Error("Session expired"); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};
function logout(){localStorage.removeItem("sheltyAdminToken");token=null;$("#app-view").classList.add("hidden");$("#login-view").classList.remove("hidden")}
function showApp(){ $("#login-view").classList.add("hidden"); $("#app-view").classList.remove("hidden"); loadView("dashboard"); }
if(token) showApp();

$("#login-form").addEventListener("submit",async e=>{
  e.preventDefault(); const f=new FormData(e.target);
  try{const d=await api("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(f.entries()))});token=d.token;localStorage.setItem("sheltyAdminToken",token);showApp()}catch(err){$("#login-error").textContent=err.message}
});
$("#logout").onclick=logout;
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>loadView(b.dataset.view));

async function loadView(view){
  const title={dashboard:"Dashboard",products:"Products",orders:"Orders",appointments:"Appointments",tailoring:"Custom Requests",students:"Student Applications"}[view];
  $("#view-title").textContent=title; window.currentView=view;
  if(view==="dashboard") return dashboard();
  if(view==="products") return products();
  if(view==="orders") return orders();
  if(view==="appointments") return appointments();
  if(view==="tailoring") return tailoring();
  if(view==="students") return students();
}
function money(n){return `GHS ${Number(n||0).toLocaleString()}`}
function esc(v=""){return String(v).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[x]))}
async function dashboard(){
 const d=await api("/api/admin/summary");
 $("#content").innerHTML=`<div class="stats">
 <div class="stat"><b>${d.products}</b><span>Active products</span></div><div class="stat"><b>${d.orders}</b><span>Total orders</span></div>
 <div class="stat"><b>${d.pendingAppointments}</b><span>Pending appointments</span></div><div class="stat"><b>${d.studentApplications}</b><span>Student applications</span></div><div class="stat"><b>${money(d.revenue)}</b><span>Paid revenue</span></div></div>
 <div class="panel"><h2>Atelier overview</h2><p>You have <strong>${d.tailoringRequests}</strong> new custom design requests. Use the menu to manage products, orders, appointments and enquiries.</p></div>`;
}
async function uploadProductImage(file){
  if(!file) return null;
  const form=new FormData();
  form.append("image",file);
  const res=await fetch("/api/admin/upload-image",{method:"POST",headers:token?{Authorization:`Bearer ${token}`}:{},body:form});
  const data=await res.json().catch(()=>({error:"Image upload failed."}));
  if(!res.ok) throw new Error(data.error||"Image upload failed.");
  return data.image_url;
}

async function products(){
 const ps=await api("/api/admin/products");
 window.__adminProducts=ps;
 const clothingTypes=["Dresses","Tops","Shirts","Trousers","Skirts","Jumpsuits","Suits","Kaftans","Agbada","Two-Piece","Outerwear","Accessories","Other"];
 const formFields=(p={})=>`
   <label>Name<input name="name" value="${esc(p.name||"")}" required></label>
   <label>Category
     <select name="category">
       ${["Women","Men","African Wear","Custom"].map(x=>`<option ${p.category===x?"selected":""}>${x}</option>`).join("")}
     </select>
   </label>
   <label>Gender
     <select name="gender">
       ${["Female","Male","Unisex"].map(x=>`<option ${p.gender===x?"selected":""}>${x}</option>`).join("")}
     </select>
   </label>
   <label>Product Type
     <select name="product_type">
       ${["Ready-to-Wear","Customized"].map(x=>`<option ${p.product_type===x?"selected":""}>${x}</option>`).join("")}
     </select>
   </label>
   <label>Clothing Type
     <select name="clothing_type">
       ${clothingTypes.map(x=>`<option ${p.clothing_type===x?"selected":""}>${x}</option>`).join("")}
     </select>
   </label>
   <label>Price (GHS)<input type="number" min="0" name="price" value="${Number(p.price||0)}"></label>
   <label>Stock<input type="number" min="0" name="stock" value="${Number(p.stock||0)}"></label>
   <label>Sizes<input name="sizes" value="${esc(p.sizes||"")}" placeholder="S,M,L,XL"></label>
   <label>Colors<input name="colors" value="${esc(p.colors||"")}" placeholder="Emerald, Ivory"></label>
   <label class="full">Product Image<input type="file" name="image_file" accept="image/jpeg,image/png,image/webp,image/gif"><input type="hidden" name="image_url" value="${esc(p.image_url||"")}"><small class="small-note">Choose an image from your computer. Maximum 5MB.</small></label>
   <label class="full">Description<textarea name="description" rows="3">${esc(p.description||"")}</textarea></label>
   <label class="check"><input type="checkbox" name="featured" ${p.featured?"checked":""}> Featured</label>
   <label class="check"><input type="checkbox" name="active" ${p.active!==false?"checked":""}> Active / visible on website</label>
 `;

 $("#content").innerHTML=`
 <div class="panel">
   <h2>Add a product</h2>
   <p class="small-note">Choose the customer-facing classifications from simple dropdowns. Every product added here will appear in the catalogue automatically when it is Active.</p>
   <form id="product-form" class="product-form">
     ${formFields()}
     <button class="full">Add product</button>
   </form>
 </div>
 <div class="panel">
   <h2>Catalogue</h2>
   <table class="data-table">
     <thead><tr><th>Product</th><th>Classification</th><th>Price</th><th>Stock</th><th>Visibility</th><th>Actions</th></tr></thead>
     <tbody>
       ${ps.length ? ps.map(p=>`
         <tr>
           <td>
             <div class="catalogue-product">
               <img src="${esc(p.image_url||"/assets/shelty-logo.png")}" alt="">
               <div><strong>${esc(p.name)}</strong><br><small>${esc(p.description||"").slice(0,80)}</small></div>
             </div>
           </td>
           <td>
             ${esc(p.gender||"Unisex")} · ${esc(p.product_type||"Ready-to-Wear")}<br>
             <small>${esc(p.category)} · ${esc(p.clothing_type||"Other")}</small>
           </td>
           <td>${p.price?money(p.price):"On request"}</td>
           <td>${Number(p.stock||0)}</td>
           <td><span class="pill">${p.active?"Active":"Hidden"}</span></td>
           <td><div class="actions">
             <button class="action primary" onclick="editProduct(${p.id})">Edit</button>
             <button class="action danger" onclick="deleteProduct(${p.id})">Delete</button>
           </div></td>
         </tr>`).join("") : `<tr><td colspan="6">No products found.</td></tr>`}
     </tbody>
   </table>
 </div>
 <div id="edit-product-modal" class="edit-modal hidden">
   <div class="edit-card">
     <div class="edit-card-header"><h2>Edit product</h2><button class="modal-close" onclick="closeEditProduct()">×</button></div>
     <form id="edit-product-form" class="product-form">
       <input type="hidden" name="id">
       ${formFields()}
       <button class="full">Save changes</button>
     </form>
   </div>
 </div>`;

 $("#product-form").onsubmit=async e=>{
   e.preventDefault();
   const f=e.target,o=Object.fromEntries(new FormData(f).entries());
   o.featured=f.featured.checked;o.active=f.active.checked;o.price=Number(o.price);o.stock=Number(o.stock);
   try{
     const uploaded=await uploadProductImage(f.image_file.files[0]);
     if(uploaded) o.image_url=uploaded;
     delete o.image_file;
     await api("/api/admin/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)});
     products();
   }catch(err){alert(err.message)}
 };
 $("#edit-product-form").onsubmit=async e=>{
   e.preventDefault();
   const f=e.target,o=Object.fromEntries(new FormData(f).entries()),id=o.id;
   delete o.id;o.featured=f.featured.checked;o.active=f.active.checked;o.price=Number(o.price);o.stock=Number(o.stock);
   try{
     const uploaded=await uploadProductImage(f.image_file.files[0]);
     if(uploaded) o.image_url=uploaded;
     delete o.image_file;
     await api("/api/admin/products/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)});
     products();
   }catch(err){alert(err.message)}
 };
}

window.editProduct=id=>{
 const row=window.__adminProducts?.find(p=>p.id===id);
 if(row) return fillEditProduct(row);
 api("/api/admin/products").then(ps=>{
   window.__adminProducts=ps;
   const p=ps.find(x=>x.id===id);
   if(p) fillEditProduct(p);
 }).catch(err=>alert(err.message));
};

function fillEditProduct(p){
 const modal=$("#edit-product-modal"),form=$("#edit-product-form");
 form.id.value=p.id;
 ["name","category","gender","product_type","clothing_type","price","stock","sizes","colors","image_url","description"].forEach(k=>{
   if(form.elements[k]) form.elements[k].value=p[k] ?? "";
 });
 form.featured.checked=!!p.featured;
 form.active.checked=p.active!==false;
 modal.classList.remove("hidden");
}
window.closeEditProduct=()=>$("#edit-product-modal")?.classList.add("hidden");

window.deleteProduct=async id=>{
 const ps=window.__adminProducts || await api("/api/admin/products");
 const p=ps.find(x=>x.id===id);
 if(!p) return;
 if(!confirm(`Delete "${p.name}" permanently? This cannot be undone.`)) return;
 try{
   await api("/api/admin/products/"+id,{method:"DELETE"});
   products();
 }catch(err){alert(err.message)}
};

async function orders(){
 const os=await api("/api/admin/orders");
 $("#content").innerHTML=`<div class="panel"><h2>Orders</h2><table class="data-table"><thead><tr><th>Reference</th><th>Customer</th><th>Items</th><th>Amount</th><th>Payment</th><th>Order status</th></tr></thead><tbody>
 ${os.map(o=>`<tr><td><strong>${esc(o.reference)}</strong><br><small>${new Date(o.created_at).toLocaleString()}</small></td><td>${esc(o.customer_name)}<br>${esc(o.phone)}<br>${esc(o.email)}</td><td>${(o.items||[]).map(i=>esc(i.name)+" × "+i.quantity).join("<br>")}</td><td>${money(o.amount)}</td><td><span class="pill">${esc(o.payment_status)}</span></td><td><select onchange="setOrderStatus(${o.id},this.value)">${["pending","processing","ready","completed","cancelled"].map(s=>`<option ${o.order_status===s?"selected":""}>${s}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div>`;
}
window.setOrderStatus=async(id,status)=>{await api("/api/admin/orders/"+id+"/status",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})})};
async function appointments(){
 const a=await api("/api/admin/appointments");
 $("#content").innerHTML=`<div class="panel"><h2>Appointments</h2><table class="data-table"><thead><tr><th>Date</th><th>Client</th><th>Service</th><th>Contact</th><th>Status</th></tr></thead><tbody>${a.map(x=>`<tr><td><strong>${esc(x.appointment_date)}</strong><br>${esc(x.appointment_time)}</td><td>${esc(x.name)}</td><td>${esc(x.service)}<br><small>${esc(x.message)}</small></td><td>${esc(x.phone)}<br>${esc(x.email)}</td><td><select onchange="setAppointmentStatus(${x.id},this.value)">${["pending","confirmed","completed","cancelled"].map(s=>`<option ${x.status===s?"selected":""}>${s}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div>`;
}
window.setAppointmentStatus=async(id,status)=>{await api("/api/admin/appointments/"+id+"/status",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})})};
async function tailoring(){
 const a=await api("/api/admin/tailoring-requests");
 $("#content").innerHTML=`<div class="panel"><h2>Custom Design Requests</h2><table class="data-table"><thead><tr><th>Client</th><th>Garment</th><th>Details</th><th>Contact</th><th>Status</th></tr></thead><tbody>${a.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.garment_type)}<br>${esc(x.occasion)}</td><td>${esc(x.message)}<br><small>Fabric: ${esc(x.fabric)} · Budget: ${esc(x.budget)}</small></td><td>${esc(x.phone)}<br>${esc(x.email)}</td><td><select onchange="setTailoringStatus(${x.id},this.value)">${["new","reviewing","accepted","completed","declined"].map(s=>`<option ${x.status===s?"selected":""}>${s}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div>`;
}
window.setTailoringStatus=async(id,status)=>{await api("/api/admin/tailoring-requests/"+id+"/status",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})})};


async function students(){
 const a=await api("/api/admin/student-applications");
 $("#content").innerHTML=`<div class="panel"><h2>Student Applications</h2><table class="data-table"><thead><tr><th>Applicant</th><th>Training</th><th>Programme</th><th>Contact</th><th>Experience</th><th>Status</th></tr></thead><tbody>
 ${a.map(x=>`<tr>
 <td><strong>${esc(x.full_name)}</strong><br>${esc(x.gender)}<br><small>${esc(x.city)}</small></td>
 <td><strong>${esc(x.duration)}</strong><br><small>Start: ${esc(x.start_date || "Not specified")}</small></td>
 <td>${esc(x.program)}<br><small>${esc(x.message)}</small></td>
 <td>${esc(x.phone)}<br>${esc(x.email)}</td>
 <td>${esc(x.experience)}</td>
 <td><select onchange="setStudentStatus(${x.id},this.value)">${["new","reviewing","accepted","enrolled","completed","declined"].map(s=>`<option ${x.status===s?"selected":""}>${s}</option>`).join("")}</select></td>
 </tr>`).join("")}</tbody></table></div>`;
}
window.setStudentStatus=async(id,status)=>{
  await api("/api/admin/student-applications/"+id+"/status",{
    method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})
  });
};
