import React from "react"

import { motion, AnimatePresence } from "framer-motion"







import { CardContent, CardHeader } from "@/components/ui/card"







import { Badge } from "@/components/ui/badge"







import { Users, Trophy, Calendar, ChevronDown, MapPin } from "lucide-react"







import { CardWrapper } from "./shared/CardWrapper"







import { Event } from "./types"







import { Button } from "@/components/ui/button"















interface EventCardProps {







  event: Event







  isExpanded: boolean







  onToggle: () => void







}















const EventCard = React.memo(({ event, isExpanded, onToggle }: EventCardProps) => {







  const handleRegister = (e: React.MouseEvent) => {







    e.stopPropagation()







    // Handle event registration







    console.log('Registering for event:', event.id)







  }















  return (







    <CardWrapper onClick={onToggle} hoverAccentColor="lime">







      <div className="relative">







        {/* Card Header - Always visible */}







        <CardHeader>







          <div className="flex justify-between items-start">







            <div>







              <h3 className="font-semibold text-lg">{event.title}</h3>







              <p className="text-sm text-gray-400">{event.game}</p>







            </div>







            <div className="flex items-center space-x-4">







              <Badge variant="outline" className="bg-gray-700">







                {event.prize}







              </Badge>







              <motion.div







                animate={{ rotate: isExpanded ? 180 : 0 }}







                transition={{ duration: 0.2 }}







              >







                <ChevronDown className="h-5 w-5 text-gray-400" />







              </motion.div>







            </div>







          </div>







        </CardHeader>















        {/* Preview Content - Always visible */}







        <CardContent>







          <p className="text-gray-300 line-clamp-2 mb-4">{event.description}</p>







          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">







            <div className="flex items-center">







              <Calendar className="h-4 w-4 mr-2" />







              <span>{event.date.toLocaleDateString()}</span>







            </div>







            <div className="flex items-center">







              <Users className="h-4 w-4 mr-2" />







              <span>{event.participants} players</span>







            </div>







            <div className="flex items-center">







              <Trophy className="h-4 w-4 mr-2" />







              <span>{event.prize}</span>







            </div>







          </div>







        </CardContent>















        {/* Expanded Content */}







        <AnimatePresence>







          {isExpanded && (







            <motion.div







              initial={{ height: 0, opacity: 0 }}







              animate={{ height: "auto", opacity: 1 }}







              exit={{ height: 0, opacity: 0 }}







              transition={{ duration: 0.2 }}







              className="overflow-hidden"







            >







              <div className="px-6 pb-6 border-t border-gray-700/50 mt-4 pt-4">







                {/* Full Event Content */}







                <div className="space-y-6">







                  <div className="prose prose-invert max-w-none">







                    <p className="text-gray-200 whitespace-pre-wrap">







                      {event.description}







                    </p>







                  </div>















                  <div>







                    <h4 className="font-semibold text-lg mb-3">Event Details</h4>







                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">







                      <div className="flex items-center text-gray-300">







                        <Calendar className="h-5 w-5 mr-3 text-gray-400" />







                        <div>







                          <p className="font-medium">Date & Time</p>







                          <p className="text-sm text-gray-400">







                            {event.date.toLocaleString()}







                          </p>







                        </div>







                      </div>







                      <div className="flex items-center text-gray-300">







                        <Users className="h-5 w-5 mr-3 text-gray-400" />







                        <div>







                          <p className="font-medium">Participants</p>







                          <p className="text-sm text-gray-400">







                            {event.participants} registered







                          </p>







                        </div>







                      </div>







                      <div className="flex items-center text-gray-300">







                        <Trophy className="h-5 w-5 mr-3 text-gray-400" />







                        <div>







                          <p className="font-medium">Prize Pool</p>







                          <p className="text-sm text-gray-400">{event.prize}</p>







                        </div>







                      </div>







                      <div className="flex items-center text-gray-300">







                        <MapPin className="h-5 w-5 mr-3 text-gray-400" />







                        <div>







                          <p className="font-medium">Location</p>







                          <p className="text-sm text-gray-400">Online</p>







                        </div>







                      </div>







                    </div>







                  </div>















                  <div>







                    <h4 className="font-semibold text-lg mb-2">Tags</h4>







                    <div className="flex flex-wrap gap-2">







                      {event.tags.map((tag) => (







                        <Badge







                          key={tag}







                          variant="secondary"







                          className="bg-gray-800/50 hover:bg-gray-700/50 transition-colors"







                        >







                          #{tag}







                        </Badge>







                      ))}







                    </div>







                  </div>















                  <div className="flex justify-end">







                    <Button







                      onClick={handleRegister}







                      className="bg-lime-500 hover:bg-lime-600 text-gray-900"







                    >







                      Register for Event







                    </Button>







                  </div>







                </div>







              </div>







            </motion.div>







          )}







        </AnimatePresence>







      </div>







    </CardWrapper>







  )







})







EventCard.displayName = 'EventCard'







export default EventCard






