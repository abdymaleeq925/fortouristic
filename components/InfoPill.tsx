import React from 'react'

const InfoPill = ({text, image}: InfoPillProps) => {
  return (
    <div>
        <figure className='info-pill'>
            <img src={image} alt="text"/>
            <figcaption>{text}</figcaption>
        </figure>
    </div>
  )
}

export default InfoPill