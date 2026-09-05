type AtelierSceneProps = {
  image?: string;
};

/** Decorative 3D atelier scene for the public storefront hero.
 * Product-specific GLB models remain available on the product page, where the
 * visitor can rotate and inspect the actual published design.
 */
export function AtelierScene({ image }: AtelierSceneProps) {
  return (
    <div className="store-atelier" aria-hidden="true">
      <div className="store-atelier__halo" />
      <div className="store-atelier__window-light" />
      <div className="store-atelier__floor" />
      <div className="store-atelier__floor-lines" />
      <div className="store-atelier__cabinet">
        <div className="store-atelier__cabinet-top" />
        <div className="store-atelier__cabinet-side" />
        <div className="store-atelier__cabinet-face">
          <div className="store-atelier__door store-atelier__door--right" />
          <div className="store-atelier__door store-atelier__door--left" />
          <span className="store-atelier__handle store-atelier__handle--one" />
          <span className="store-atelier__handle store-atelier__handle--two" />
        </div>
        <i className="store-atelier__leg store-atelier__leg--right" />
        <i className="store-atelier__leg store-atelier__leg--left" />
      </div>
      <div className="store-atelier__frame">
        {image ? <img src={image} alt="" /> : <div className="store-atelier__frame-gradient" />}
      </div>
      <div className="store-atelier__tag">ALMUQRIN / 01</div>
    </div>
  );
}
