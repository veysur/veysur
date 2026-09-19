// cspell:ignore apos doesn
import { useNavigate } from 'react-router-dom'

import { Button } from 'component/shadcn/button'
import { Container } from 'component/shadcn/container'
import { GoldenCentered } from 'component/GoldenCentered'
import { usePageTitle } from 'hook'

export const Page404: React.FC = () => {
  usePageTitle('Page Not Found')
  const navigate = useNavigate()

  return (
    <Container>
      <GoldenCentered className="min-h-screen" topOffset="0px">
        <div className="text-center space-y-4">
          <div className="text-8xl font-bold text-muted-foreground/30">404</div>
          <h1 className="text-2xl font-semibold">Page not found</h1>
          <p className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button onClick={() => navigate('/')}>Go home</Button>
        </div>
      </GoldenCentered>
    </Container>
  )
}

export default Page404
