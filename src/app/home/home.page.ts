import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient} from '@angular/common/http';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { IonInput, LoadingController } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { NavController } from '@ionic/angular';
import { AlertController } from '@ionic/angular';
import { BarcodeScanner, BarcodeScannerOptions } from '@awesome-cordova-plugins/barcode-scanner/ngx';

interface Producto {
  nombre: string;
  cantidad: number;
  tipo: 'caja' | 'fraccion';
  valorUnitario: number;
  valorTotal: number;
}


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {


  public results: any[] = [];
  public resultsp: any[] = [];
  public idfactura: string = "";
  public referencia: string = "";
  public referencia_selec: string = "";

  public precioc: string = "0";
  public preciof: string = "0";
  public cantidadc: number = 0;
  public cantidadf: number = 0;
  public scannedBarCode: any;
  public barcodeScannerOptions: BarcodeScannerOptions;
  public encodedData: any;
  public codigo: string = "";
  public cantida: number = 0;
  productos: Producto[] = [];
  public total: number = 0;

  
  @ViewChild('cod', {static: false}) cod!:IonInput;
  @ViewChild('a', {static: false}) codInput!: IonInput;

  constructor(
    private http: HttpClient,
    public AlertController: AlertController,
    private router: Router,
    public loadingController: LoadingController,
    private storage: Storage,
    private navCtrl: NavController,
    private scanner: BarcodeScanner,
    private route: ActivatedRoute

  )         
  { 
    this.encodedData = "";
    this.barcodeScannerOptions = {
    showTorchButton: true,
    showFlipCameraButton: true
    };
    this.init();
}

  ngOnInit() {

  }

  async init() {
    await this.storage.create();   
  }

  async getListado()
  {
    const loading = await this.loadingController.create({
      message: 'Cargando referencias'
    });
    await loading.present();

    this.http.get("https://appssmartpos.azurewebsites.net/restapi_precios_habib/buscar_referencias.php?desc="+this.referencia).subscribe((data:any) => {
      this.results = data["results"];
      loading.dismiss();
      }); 
      
      loading.dismiss();
      this.referencia = "";
  }

  Buscar(referencia:string)
  {
    if(referencia.length > 3)
    {
      this.getListado();
    }
    else
    {
      this.MensajeError("DESC");
    }
  }

  Seleccionar(precioc: string, preciof: string, descripcion: string)
  {
      this.referencia_selec = descripcion;
      this.precioc = precioc;
      this.preciof = preciof;
      this.results.length = 0;
      this.cantidadc = 0;
      this.cantidadf = 0;
  }

  async reload()
  {
   this.limpiarProductos();
   this.productos = await this.obtenerProductos();
   this.total = 0; 
  }


  
  async Precio()
  {

    if(this.codigo != "")
    {
      this.precioc = "0";
      this.preciof = "0";
      const loading = await this.loadingController.create({
        message: 'Consultando los precios'
      });
      await loading.present();
  
      this.http.get("https://appssmartpos.azurewebsites.net/restapi_precios_habib/precios.php?cod="+this.codigo).subscribe((data:any) => {
        this.resultsp = data["results"];
        this.precioc = this.resultsp[0].precioc;
        this.preciof = this.resultsp[0].preciof;
        this.referencia_selec = this.resultsp[0].descripcion;
        loading.dismiss();
        }); 
        
        loading.dismiss();
    }
    else{
        this.MensajeError("CODIGOVA");
    }      
  }

  async agregarProducto(nombre: string, tipo: 'caja' | 'fraccion', cantidad: number, valorUnitario: number) {
    if (this.storage) {
      let productos: Producto[] = await this.storage.get('productos') || [];
      let valorTotal = valorUnitario * cantidad;
      let producto: Producto = {nombre, tipo, cantidad, valorUnitario, valorTotal};
      productos.push(producto);
      await this.storage.set('productos', productos);
      this.productos = productos;
      this.total =  productos.reduce((total, producto) => total + producto.valorTotal, 0);
    }
  }

  async Agregar(referencia_selec: string,cantidadc: number, precioc: string ,cantidadf: number, preciof: string)
  {
    if(referencia_selec != "")
      {
        if(cantidadc > 0)
        { 
          this.agregarProducto(referencia_selec, 'caja', cantidadc, parseFloat(precioc.replace(/\./g, '')));
          this.MensajeError("CODIGOREG");
        }
        if(cantidadf > 0)
        {
          this.agregarProducto(referencia_selec, 'fraccion', cantidadf, parseFloat(preciof.replace(/\./g, '')));
          this.MensajeError("CODIGOREG");
        }
      }
      else
      {
        this.MensajeError("CODIGOVA");
      }


      //this.productos = await this.obtenerProductos();
  }

  async obtenerProductos() {
    if (this.storage) {
      return await this.storage.get('productos') || [];
    }
    return [];
  }

  async totalizarProductos() {
    if (this.storage) {
      let productos: Producto[] = await this.storage.get('productos') || [];
      return productos.reduce((total, producto) => total + producto.valorTotal, 0);
    }
    return 0;
  }

  async limpiarProductos() {
    if (this.storage) {
      await this.storage.remove('productos');
    }
  }

  async MensajeError(tipo:string) {

    if(tipo =="CANTIDAD")
    {
      const alert = await this.AlertController.create({
        header: 'INFORMACIÓN INCOMPLETA',
        subHeader: 'La cantidad debe ser mayor a 0 y no puede ser superior a la cantidad del pedido',
        buttons: ['OK']
      });
      await alert.present();

    }
    else if(tipo =="CODIGOOK")
    {
      const alert = await this.AlertController.create({
        header: 'CÓDIGO CORRECTO',
        subHeader: 'El código ingresado correspone a la referencia',
        buttons: ['OK']
      });
      await alert.present();

    }
    else if(tipo =="CODIGOREG")
    {
      const alert = await this.AlertController.create({
        header: 'PRODUCTO AGREGADO',
        subHeader: 'El producto se agregó correctamente',
        buttons: ['OK']
      });
      await alert.present();
   }
    else if(tipo =="CODIGOERR")
    {
      const alert = await this.AlertController.create({
        header: 'CÓDIGO INCORRECTO',
        subHeader: 'El código ingresado no correspone a la referencia',
        buttons: ['OK']
      });
      await alert.present();

    }
    else if(tipo =="CODIGOVA")
    {
      const alert = await this.AlertController.create({
        header: 'REFERENCIA VACIA',
        subHeader: 'Seleccione una referencia',
        buttons: ['OK']
      });
      await alert.present();

    }
    else if(tipo =="DESC")
    {
      const alert = await this.AlertController.create({
        header: 'TEXTO INSUFICIENTE',
        subHeader: 'La descripción del producto debe tener una longitud mínima de 4 caracteres',
        buttons: ['OK']
      });
      await alert.present();

    }
 }

 async  scanBRcode() {
   await this.scanner.scan().then(res => {
      this.scannedBarCode = res;
      this.codigo = this.scannedBarCode["text"];
      
    }).catch(err => {
      alert(err);
      this.codigo = "";
    });
 

}

async Leer()
{
  //this.scanBRcode();
  if(this.codigo != "")
  {
    this.precioc = "0";
    this.preciof = "0";
    const loading = await this.loadingController.create({
      message: 'Consultando los precios'
    });
    await loading.present();

    this.http.get("https://appssmartpos.azurewebsites.net/restapi_precios_habib/precios.php?cod="+this.codigo).subscribe((data:any) => {
      this.resultsp = data["results"];
      this.precioc = this.resultsp[0].precioc;
      this.preciof = this.resultsp[0].preciof;
      this.referencia_selec = this.resultsp[0].descripcion;
      loading.dismiss();
      }); 
      
      loading.dismiss();
  }
  else{
      this.MensajeError("CODIGOVA");
  }   

}

Registrar(codigo:string)
{

}

 async Consultar()
 {

       this.Precio();
       //
       console.log("Llegó");
       this.Limpiar();
       //this.MensajeError("CODIGOOK");             
 }

 Limpiar()
 {
  //this.codigo = "";
  setTimeout(() => {
    this.cod.setFocus();
    this.codigo = "";
  },1000)
 }

 async Accion()
 {
   await this.Leer();
   setTimeout(() => {
     this.codInput.setFocus();
   },150);
 }

}

